import { describe, expect, test, vi, beforeEach } from "vitest";

// Mock the ToolRouter first (before copilot-sdk imports it)
const mockRun = vi.fn().mockResolvedValue({
  skill: "navigate_page",
  success: true,
  data: { title: "Test Page" },
  path: "dom",
  durationMs: 100,
});

vi.mock("../../src/orchestrator/tool-router.js", () => ({
  ToolRouter: class MockToolRouter {
    run = mockRun;
  },
}));

// Mock config
vi.mock("../../src/config.js", () => ({
  config: {
    AZURE_OPENAI_ENDPOINT: "https://test.openai.azure.com/",
    AZURE_OPENAI_MODEL: "gpt-4o",
  },
}));

// Mock the Copilot SDK
const mockSession = {
  on: vi.fn().mockReturnValue(() => {}),
  sendAndWait: vi.fn().mockResolvedValue({
    data: { content: "Test response from Copilot" },
  }),
};

const mockClient = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue([]),
  createSession: vi.fn().mockResolvedValue(mockSession),
};

vi.mock("@github/copilot-sdk", () => ({
  CopilotClient: class MockCopilotClient {
    start = mockClient.start;
    stop = mockClient.stop;
    createSession = mockClient.createSession;
  },
  defineTool: vi.fn((name: string, config: Record<string, unknown>) => ({
    name,
    ...config,
  })),
}));

describe("Copilot SDK integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("startCopilotSession creates a session and returns response", async () => {
    const mod = await import("../../src/copilot-sdk.js");
    await mod.stopCopilotClient(); // reset
    const result = await mod.startCopilotSession("user1", "session1", "Hello");

    expect(result.response).toBe("Test response from Copilot");
    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);
  });

  test("createSession is called with model and tools", async () => {
    const mod = await import("../../src/copilot-sdk.js");
    await mod.stopCopilotClient();
    await mod.startCopilotSession("user1", "session1", "Test");

    expect(mockClient.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o",
        tools: expect.any(Array),
      }),
    );
  });

  test("stopCopilotClient stops the client", async () => {
    const mod = await import("../../src/copilot-sdk.js");
    // Start first
    await mod.startCopilotSession("user1", "s1", "hi");
    await mod.stopCopilotClient();
    expect(mockClient.stop).toHaveBeenCalled();
  });

  test("defineTool is called for all 11 browser agent skills", async () => {
    const { defineTool } = await import("@github/copilot-sdk");
    const mod = await import("../../src/copilot-sdk.js");
    await mod.stopCopilotClient();
    vi.mocked(defineTool).mockClear();
    await mod.startCopilotSession("user1", "session1", "Test");

    const toolNames = vi.mocked(defineTool).mock.calls.map((call) => call[0]);
    const expectedSkills = [
      "navigate_page", "extract_content", "fill_form", "submit_action",
      "discover_apis", "capture_screenshot", "compare_data",
      "send_teams_message", "manage_calendar", "create_adaptive_card", "analyze_work_patterns",
    ];

    for (const skill of expectedSkills) {
      expect(toolNames).toContain(skill);
    }
    expect(toolNames.length).toBe(11);
  });

  test("session config includes system message about browser automation", async () => {
    const mod = await import("../../src/copilot-sdk.js");
    await mod.stopCopilotClient();
    await mod.startCopilotSession("user1", "session1", "Test");

    const sessionConfig = mockClient.createSession.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sessionConfig).toHaveProperty("systemMessage");
    const sysMsg = sessionConfig.systemMessage as { content: string };
    expect(sysMsg.content).toContain("browser automation agent");
  });
});
