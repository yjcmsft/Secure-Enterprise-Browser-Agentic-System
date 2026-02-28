import { describe, expect, test } from "vitest";
import { orchestrateWorkflow } from "../../../src/skills/orchestrate-workflow.js";

describe("orchestrateWorkflow", () => {
  test("handles unknown skill gracefully", async () => {
    const result = await orchestrateWorkflow(
      {
        steps: [
          {
            skill: "unknown_skill",
            params: {},
          },
        ],
      },
      { userId: "u1", sessionId: "s1" },
    );

    expect(result.success).toBe(false);
    expect((result.data as { results: unknown[] }).results).toHaveLength(1);
  });

  test("rejects non-array workflow steps", async () => {
    const result = await orchestrateWorkflow(
      {
        steps: "not-an-array",
      },
      { userId: "u1", sessionId: "s1" },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("steps must be an array");
  });

  test("rejects oversized workflow", async () => {
    const steps = Array.from({ length: 26 }, () => ({
      skill: "extract_content",
      params: { mode: "text" },
    }));

    const result = await orchestrateWorkflow(
      {
        steps,
      },
      { userId: "u1", sessionId: "s1" },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("max 25 steps allowed");
  });
});
