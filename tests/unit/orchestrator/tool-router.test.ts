import { describe, expect, test, vi } from "vitest";
import { ToolRouter } from "../../../src/orchestrator/tool-router.js";
import type { SkillExecutionContext } from "../../../src/types/skills.js";

// Mock the skills registry
vi.mock("../../../src/skills/index.js", () => ({
  getSkill: vi.fn((name: string) => {
    if (name === "known_skill") {
      return async () => ({
        skill: "navigate_page" as const,
        success: true,
        data: { ok: true },
        durationMs: 10,
      });
    }
    if (name === "failing_skill") {
      return async () => {
        throw new Error("Skill failed");
      };
    }
    if (name === "retryable_skill") {
      let calls = 0;
      return async () => {
        calls++;
        if (calls < 3) throw new Error("ECONNRESET");
        return {
          skill: "navigate_page" as const,
          success: true,
          data: { recovered: true },
          durationMs: 10,
        };
      };
    }
    if (name === "non_retryable_error") {
      return async () => {
        throw new Error("Validation error");
      };
    }
    return undefined;
  }),
}));

const ctx: SkillExecutionContext = { userId: "user1", sessionId: "s1" };

describe("ToolRouter", () => {
  const router = new ToolRouter();

  test("runs a known skill successfully", async () => {
    const result = await router.run("known_skill", {}, ctx);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ok: true });
  });

  test("returns error for unknown skill", async () => {
    const result = await router.run("nonexistent_skill", {}, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown skill");
  });

  test("returns error for non-retryable failures", async () => {
    const result = await router.run("non_retryable_error", {}, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Validation error");
  });
});
