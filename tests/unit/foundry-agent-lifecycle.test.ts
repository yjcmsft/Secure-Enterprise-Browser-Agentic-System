import { describe, expect, test, vi, beforeEach } from "vitest";

const mockProjectClient = vi.hoisted(() => ({
  agents: {
    createAgent: vi.fn().mockResolvedValue({ id: "agent-1" }),
    deleteAgent: vi.fn().mockResolvedValue(undefined),
    threads: {
      create: vi.fn().mockResolvedValue({ id: "thread-1" }),
    },
  },
}));

vi.mock("@azure/ai-projects", () => ({
  AIProjectClient: vi.fn(function AIProjectClient() {
    return mockProjectClient;
  }),
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn(),
}));

// Mock config to provide endpoint
vi.mock("../../src/config.js", () => ({
  config: {
    AZURE_AI_PROJECT_ENDPOINT: "https://test.openai.azure.com",
    AZURE_OPENAI_MODEL: "gpt-4o",
    allowlistPatterns: ["*"],
    MAX_BROWSER_CONCURRENCY: 3,
    SESSION_TTL_MS: 600000,
    TARGET_APP_SCOPE: "https://graph.microsoft.com/.default",
    GRAPH_DEFAULT_SCOPE: "https://graph.microsoft.com/.default",
    CONTENT_SAFETY_ENDPOINT: "",
    CONTENT_SAFETY_BLOCK_THRESHOLD: 4,
  },
}));

// Mock the tool-router
vi.mock("../../src/orchestrator/tool-router.js", () => ({
  ToolRouter: vi.fn(function ToolRouter() {
    return {
      run: vi.fn().mockResolvedValue({ success: true, data: "mocked" }),
    };
  }),
}));

import {
  functionTools,
  AGENT_INSTRUCTIONS,
  startFoundryAgent,
  createThread,
  executeToolCall,
  getFoundryAgent,
  stopFoundryAgent,
} from "../../src/foundry-agent.js";

describe("Foundry Agent Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("functionTools has 12 tools defined", () => {
    expect(functionTools).toHaveLength(12);
    const names = functionTools.map((t) => t.function.name);
    expect(names).toContain("navigate_page");
    expect(names).toContain("extract_content");
    expect(names).toContain("fill_form");
    expect(names).toContain("submit_action");
    expect(names).toContain("discover_apis");
    expect(names).toContain("capture_screenshot");
    expect(names).toContain("compare_data");
    expect(names).toContain("orchestrate_workflow");
  });

  test("each tool has required properties", () => {
    for (const tool of functionTools) {
      expect(tool.type).toBe("function");
      expect(tool.function.name).toBeTruthy();
      expect(tool.function.description).toBeTruthy();
      expect(tool.function.parameters).toBeDefined();
    }
  });

  test("AGENT_INSTRUCTIONS contains security rules", () => {
    expect(AGENT_INSTRUCTIONS).toContain("URL allowlist");
    expect(AGENT_INSTRUCTIONS).toContain("approval");
    expect(AGENT_INSTRUCTIONS.toLowerCase()).toContain("never");
  });

  test("startFoundryAgent creates agent and returns client + id", async () => {
    const result = await startFoundryAgent();
    expect(result.client).toBeDefined();
    expect(result.agentId).toBe("agent-1");
    expect(mockProjectClient.agents.createAgent).toHaveBeenCalledWith(
      "gpt-4o",
      expect.objectContaining({
        name: "secure-browser-agent",
        instructions: expect.any(String),
        tools: expect.any(Array),
      }),
    );
  });

  test("getFoundryAgent returns client after start", async () => {
    await startFoundryAgent();
    const agent = getFoundryAgent();
    expect(agent).not.toBeNull();
    expect(agent?.agentId).toBe("agent-1");
  });

  test("createThread creates a new thread", async () => {
    await startFoundryAgent();
    const threadId = await createThread();
    expect(threadId).toBe("thread-1");
    expect(mockProjectClient.agents.threads.create).toHaveBeenCalled();
  });

  test("createThread throws when agent not started", async () => {
    // Stop agent first to clear state
    await stopFoundryAgent();
    await expect(createThread()).rejects.toThrow("Foundry agent not started");
  });

  test("executeToolCall routes to ToolRouter and returns JSON string", async () => {
    const result = await executeToolCall(
      "navigate_page",
      { url: "https://example.com" },
      { userId: "u1", sessionId: "s1" },
    );
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result);
    expect(parsed).toBeDefined();
  });

  test("stopFoundryAgent deletes agent and clears state", async () => {
    await startFoundryAgent();
    await stopFoundryAgent();
    expect(mockProjectClient.agents.deleteAgent).toHaveBeenCalledWith("agent-1");
    expect(getFoundryAgent()).toBeNull();
  });

  test("stopFoundryAgent handles deletion error gracefully", async () => {
    await startFoundryAgent();
    mockProjectClient.agents.deleteAgent.mockRejectedValueOnce(
      new Error("Delete failed"),
    );
    await expect(stopFoundryAgent()).resolves.not.toThrow();
    expect(getFoundryAgent()).toBeNull();
  });

  test("stopFoundryAgent is safe to call when not started", async () => {
    await stopFoundryAgent(); // Already stopped
    await expect(stopFoundryAgent()).resolves.not.toThrow();
  });
});

describe("startFoundryAgent without endpoint", () => {
  test("throws when AZURE_AI_PROJECT_ENDPOINT is missing", async () => {
    const configMod = await import("../../src/config.js");
    const original = configMod.config.AZURE_AI_PROJECT_ENDPOINT;
    (configMod.config as Record<string, unknown>).AZURE_AI_PROJECT_ENDPOINT = "";

    await expect(startFoundryAgent()).rejects.toThrow("AZURE_AI_PROJECT_ENDPOINT is required");

    (configMod.config as Record<string, unknown>).AZURE_AI_PROJECT_ENDPOINT = original;
  });
});
