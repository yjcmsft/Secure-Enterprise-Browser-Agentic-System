import { describe, expect, test, vi } from "vitest";
import {
  functionTools,
  AGENT_INSTRUCTIONS,
  getFoundryAgent,
  executeToolCall,
} from "../../src/foundry-agent.js";
import type { SkillExecutionContext } from "../../src/types/skills.js";

const { MockToolRouter } = vi.hoisted(() => ({
  MockToolRouter: vi.fn(function MockToolRouter() {
    return {
      run: vi.fn().mockResolvedValue({
        skill: "navigate_page",
        success: true,
        data: { title: "Page" },
        durationMs: 10,
      }),
    };
  }),
}));

// Mock the tool router to test executeToolCall
vi.mock("../../src/orchestrator/tool-router.js", () => ({
  ToolRouter: MockToolRouter,
}));

const ctx: SkillExecutionContext = { userId: "user1", sessionId: "s1" };

describe("Foundry Agent", () => {
  test("functionTools contains exactly 8 tools", () => {
    expect(functionTools).toHaveLength(8);
  });

  test("each tool has required schema structure", () => {
    for (const tool of functionTools) {
      expect(tool.type).toBe("function");
      expect(typeof tool.function.name).toBe("string");
      expect(typeof tool.function.description).toBe("string");
      expect(tool.function.parameters).toBeDefined();
      expect(tool.function.parameters!.type).toBe("object");
    }
  });

  test("AGENT_INSTRUCTIONS is a non-empty string", () => {
    expect(typeof AGENT_INSTRUCTIONS).toBe("string");
    expect(AGENT_INSTRUCTIONS.length).toBeGreaterThan(100);
  });

  test("getFoundryAgent returns null before start", () => {
    expect(getFoundryAgent()).toBeNull();
  });

  test("executeToolCall returns JSON stringified result", async () => {
    const result = await executeToolCall("navigate_page", { url: "https://example.com" }, ctx);
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.data.title).toBe("Page");
  });
});
