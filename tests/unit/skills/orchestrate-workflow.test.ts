import { describe, expect, test, vi } from "vitest";
import { orchestrateWorkflow } from "../../../src/skills/orchestrate-workflow.js";
import type { SkillExecutionContext } from "../../../src/types/skills.js";

vi.mock("../../../src/skills/index.js", () => ({
  getSkill: vi.fn((name: string) => {
    if (name === "navigate_page") {
      return async () => ({
        skill: "navigate_page" as const,
        success: true,
        data: { title: "Page" },
        durationMs: 10,
      });
    }
    if (name === "extract_content") {
      return async () => ({
        skill: "extract_content" as const,
        success: true,
        data: { textBlocks: ["content"] },
        durationMs: 5,
      });
    }
    if (name === "failing_skill") {
      return async () => {
        throw new Error("Skill exploded");
      };
    }
    if (name === "soft_fail") {
      return async () => ({
        skill: "extract_content" as const,
        success: false,
        error: "No data",
        durationMs: 2,
      });
    }
    return undefined;
  }),
}));

const ctx: SkillExecutionContext = { userId: "user1", sessionId: "s1" };

describe("orchestrateWorkflow", () => {
  test("returns error when steps is not an array", async () => {
    const result = await orchestrateWorkflow({ steps: "not-array" }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain("steps must be an array");
  });

  test("returns error when too many steps", async () => {
    const steps = Array.from({ length: 30 }, (_, i) => ({
      skill: "navigate_page",
      params: { url: `https://example.com/${i}` },
    }));
    const result = await orchestrateWorkflow({ steps }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain("max 25 steps");
  });

  test("executes single step successfully", async () => {
    const result = await orchestrateWorkflow(
      { steps: [{ skill: "navigate_page", params: { url: "https://example.com" } }] },
      ctx,
    );
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("results");
    const results = (result.data as { results: unknown[] }).results;
    expect(results).toHaveLength(1);
  });

  test("executes multiple steps in sequence", async () => {
    const result = await orchestrateWorkflow(
      {
        steps: [
          { skill: "navigate_page", params: { url: "https://example.com" } },
          { skill: "extract_content", params: { mode: "all" } },
        ],
      },
      ctx,
    );
    expect(result.success).toBe(true);
    const results = (result.data as { results: unknown[] }).results;
    expect(results).toHaveLength(2);
  });

  test("stops on unknown skill", async () => {
    const result = await orchestrateWorkflow(
      {
        steps: [
          { skill: "navigate_page", params: {} },
          { skill: "nonexistent", params: {} },
          { skill: "extract_content", params: {} },
        ],
      },
      ctx,
    );
    expect(result.success).toBe(false);
    const results = (result.data as { results: { skill: string }[] }).results;
    expect(results).toHaveLength(2); // stops at unknown skill
  });

  test("stops on exception", async () => {
    const result = await orchestrateWorkflow(
      {
        steps: [
          { skill: "navigate_page", params: {} },
          { skill: "failing_skill", params: {} },
          { skill: "extract_content", params: {} },
        ],
      },
      ctx,
    );
    expect(result.success).toBe(false);
  });

  test("stops on soft failure", async () => {
    const result = await orchestrateWorkflow(
      {
        steps: [
          { skill: "soft_fail", params: {} },
          { skill: "extract_content", params: {} },
        ],
      },
      ctx,
    );
    expect(result.success).toBe(false);
    const results = (result.data as { results: unknown[] }).results;
    expect(results).toHaveLength(1);
  });

  test("handles steps with null params gracefully", async () => {
    const result = await orchestrateWorkflow(
      { steps: [{ skill: "navigate_page", params: null }] },
      ctx,
    );
    expect(result.success).toBe(true);
  });

  test("returns durationMs", async () => {
    const result = await orchestrateWorkflow(
      { steps: [{ skill: "navigate_page", params: {} }] },
      ctx,
    );
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("empty steps array succeeds trivially", async () => {
    const result = await orchestrateWorkflow({ steps: [] }, ctx);
    expect(result.success).toBe(true);
    const results = (result.data as { results: unknown[] }).results;
    expect(results).toHaveLength(0);
  });
});
