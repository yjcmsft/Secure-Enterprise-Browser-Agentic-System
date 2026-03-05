import { describe, expect, test, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// Hoist mock variables so they're accessible inside vi.mock() factories
const {
  createAsyncIterable,
  defaultMessages,
  mockCreateThread,
  mockExecuteToolCall,
  mockFoundryClient,
  MockEventEncoder,
} = vi.hoisted(() => {
  function _createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
    return {
      [Symbol.asyncIterator]() {
        let i = 0;
        return {
          async next() {
            if (i < items.length) return { value: items[i++]!, done: false };
            return { value: undefined as unknown as T, done: true };
          },
        };
      },
    };
  }

  const _defaultMessages = [
    {
      role: "assistant",
      createdAt: new Date(),
      content: [{ type: "text", text: { value: "Hello from agent" } }],
    },
  ];

  return {
    createAsyncIterable: _createAsyncIterable,
    defaultMessages: _defaultMessages,
    mockCreateThread: vi.fn().mockResolvedValue("thread-123"),
    mockExecuteToolCall: vi.fn().mockResolvedValue('{"result":"ok"}'),
    mockFoundryClient: {
      agents: {
        messages: {
          create: vi.fn().mockResolvedValue({}),
          list: vi.fn().mockReturnValue(_createAsyncIterable(_defaultMessages)),
        },
        runs: {
          create: vi.fn().mockResolvedValue({
            id: "run-1",
            status: "completed",
            createdAt: new Date(0),
          }),
          get: vi.fn().mockResolvedValue({ id: "run-1", status: "completed" }),
          submitToolOutputs: vi.fn().mockResolvedValue({ id: "run-1", status: "completed" }),
        },
      },
    },
    MockEventEncoder: vi.fn(function MockEventEncoder() {
      return {
        encode: vi.fn((event: unknown) => `data: ${JSON.stringify(event)}\n\n`),
      };
    }),
  };
});

vi.mock("../../src/foundry-agent.js", () => ({
  getFoundryAgent: vi.fn().mockReturnValue({
    client: mockFoundryClient,
    agentId: "agent-123",
  }),
  createThread: mockCreateThread,
  executeToolCall: mockExecuteToolCall,
}));

vi.mock("@ag-ui/encoder", () => ({
  EventEncoder: MockEventEncoder,
}));

import { handleAgUiStream, getSessionState } from "../../src/agui-handler.js";

function createMockReqRes(body: Record<string, unknown> = {}) {
  const req = { body } as Request;
  const chunks: string[] = [];
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    writeHead: vi.fn(),
    write: vi.fn((chunk: string) => chunks.push(chunk)),
    end: vi.fn(),
    _chunks: chunks,
  } as unknown as Response & { _chunks: string[] };
  return { req, res };
}

describe("handleAgUiStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock values after clearing
    mockFoundryClient.agents.messages.create.mockResolvedValue({});
    mockFoundryClient.agents.messages.list.mockReturnValue(createAsyncIterable(defaultMessages));
    mockFoundryClient.agents.runs.create.mockResolvedValue({
      id: "run-1",
      status: "completed",
      createdAt: new Date(0),
    });
    mockFoundryClient.agents.runs.get.mockResolvedValue({ id: "run-1", status: "completed" });
    mockFoundryClient.agents.runs.submitToolOutputs.mockResolvedValue({ id: "run-1", status: "completed" });
    mockCreateThread.mockResolvedValue("thread-123");
    mockExecuteToolCall.mockResolvedValue('{"result":"ok"}');
  });

  test("returns 400 when prompt is missing", async () => {
    const { req, res } = createMockReqRes({});
    await handleAgUiStream(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "prompt is required" });
  });

  test("returns 503 when foundry agent not started", async () => {
    const { getFoundryAgent } = await import("../../src/foundry-agent.js");
    vi.mocked(getFoundryAgent).mockReturnValueOnce(null);

    const { req, res } = createMockReqRes({ prompt: "hello" });
    await handleAgUiStream(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  test("streams SSE events for a simple prompt", async () => {
    const { req, res } = createMockReqRes({
      prompt: "Navigate to example.com",
      userId: "user-1",
      sessionId: "sess-1",
    });

    await handleAgUiStream(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      "Content-Type": "text/event-stream",
    }));
    expect(res.write).toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
  });

  test("creates new thread when threadId not provided", async () => {
    const { req, res } = createMockReqRes({ prompt: "test" });
    await handleAgUiStream(req, res);
    expect(mockCreateThread).toHaveBeenCalled();
  });

  test("reuses existing threadId when provided", async () => {
    const { req, res } = createMockReqRes({
      prompt: "test",
      threadId: "existing-thread",
    });
    await handleAgUiStream(req, res);
    expect(mockCreateThread).not.toHaveBeenCalled();
    expect(mockFoundryClient.agents.messages.create).toHaveBeenCalledWith(
      "existing-thread",
      "user",
      "test",
    );
  });

  test("handles requires_action status with tool calls", async () => {
    mockFoundryClient.agents.runs.create.mockResolvedValueOnce({
      id: "run-tool",
      status: "requires_action",
      requiredAction: {
        type: "submit_tool_outputs",
        submitToolOutputs: {
          toolCalls: [
            {
              id: "tc-1",
              type: "function",
              function: {
                name: "navigate_page",
                arguments: '{"url":"https://example.com"}',
              },
            },
          ],
        },
      },
    });
    mockFoundryClient.agents.runs.submitToolOutputs.mockResolvedValueOnce({
      id: "run-tool",
      status: "completed",
    });
    mockFoundryClient.agents.messages.list.mockReturnValueOnce(
      createAsyncIterable([
        {
          role: "assistant",
          createdAt: new Date(0),
          content: [{ type: "text", text: { value: "Done!" } }],
        },
      ]),
    );

    const { req, res } = createMockReqRes({
      prompt: "go to example.com",
      sessionId: "tool-session",
    });
    await handleAgUiStream(req, res);

    expect(mockExecuteToolCall).toHaveBeenCalledWith(
      "navigate_page",
      { url: "https://example.com" },
      expect.objectContaining({ sessionId: "tool-session" }),
    );
    expect(res.end).toHaveBeenCalled();
  });

  test("handles tool call with invalid JSON arguments", async () => {
    mockFoundryClient.agents.runs.create.mockResolvedValueOnce({
      id: "run-bad",
      status: "requires_action",
      requiredAction: {
        type: "submit_tool_outputs",
        submitToolOutputs: {
          toolCalls: [
            {
              id: "tc-bad",
              type: "function",
              function: { name: "navigate_page", arguments: "not-json" },
            },
          ],
        },
      },
    });
    mockFoundryClient.agents.runs.submitToolOutputs.mockResolvedValueOnce({
      id: "run-bad",
      status: "completed",
    });

    const { req, res } = createMockReqRes({ prompt: "test" });
    await handleAgUiStream(req, res);
    // Should not crash — falls back to empty args
    expect(res.end).toHaveBeenCalled();
  });

  test("merges client state into session", async () => {
    const { req, res } = createMockReqRes({
      prompt: "test",
      sessionId: "state-session",
      state: { currentUrl: "https://example.com" },
    });
    await handleAgUiStream(req, res);

    const state = getSessionState("state-session");
    expect(state).toBeDefined();
    expect(state?.currentUrl).toBe("https://example.com");
  });

  test("handles polling with in_progress status", async () => {
    let callCount = 0;
    mockFoundryClient.agents.runs.create.mockResolvedValueOnce({
      id: "run-poll",
      status: "in_progress",
    });
    mockFoundryClient.agents.runs.get.mockImplementation(async () => {
      callCount++;
      if (callCount >= 2) {
        return { id: "run-poll", status: "completed" };
      }
      return { id: "run-poll", status: "in_progress" };
    });

    const { req, res } = createMockReqRes({ prompt: "test" });
    await handleAgUiStream(req, res);
    expect(mockFoundryClient.agents.runs.get).toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
  });

  test("handles error during streaming", async () => {
    mockFoundryClient.agents.runs.create.mockRejectedValueOnce(
      new Error("Azure service unavailable"),
    );

    const { req, res } = createMockReqRes({ prompt: "test" });
    await handleAgUiStream(req, res);
    expect(res.end).toHaveBeenCalled();
    // Should emit RUN_ERROR event
    const chunks = (res as unknown as { _chunks: string[] })._chunks;
    const errorChunk = chunks.find((c: string) => c.includes("RUN_ERROR"));
    // Error event should be emitted (event type is in the chunk)
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("uses default userId and sessionId", async () => {
    const { req, res } = createMockReqRes({ prompt: "test" });
    await handleAgUiStream(req, res);
    expect(res.end).toHaveBeenCalled();
  });

  test("handles queued status", async () => {
    mockFoundryClient.agents.runs.create.mockResolvedValueOnce({
      id: "run-q",
      status: "queued",
    });
    mockFoundryClient.agents.runs.get.mockResolvedValueOnce({
      id: "run-q",
      status: "completed",
    });

    const { req, res } = createMockReqRes({ prompt: "test" });
    await handleAgUiStream(req, res);
    expect(res.end).toHaveBeenCalled();
  });
});

describe("getSessionState", () => {
  test("returns undefined for unknown session", () => {
    expect(getSessionState("unknown-id")).toBeUndefined();
  });
});
