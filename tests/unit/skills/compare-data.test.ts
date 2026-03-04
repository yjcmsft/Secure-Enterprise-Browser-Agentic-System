import { describe, expect, test } from "vitest";
import { compareData } from "../../../src/skills/compare-data.js";
import type { SkillExecutionContext } from "../../../src/types/skills.js";

// compareData calls navigatePage and extractContent which depend on runtime
// We test the structural logic (empty urls, etc.) without mocking the full runtime

const ctx: SkillExecutionContext = { userId: "user1", sessionId: "s1" };

describe("compareData", () => {
  test("returns failure for empty urls array", async () => {
    const result = await compareData({ urls: [] }, ctx);
    expect(result.skill).toBe("compare_data");
    expect(result.success).toBe(false);
    expect(result.error).toContain("at least one entry");
  });

  test("returns failure for missing urls param", async () => {
    const result = await compareData({}, ctx);
    expect(result.success).toBe(false);
  });

  test("returns failure for non-array urls", async () => {
    const result = await compareData({ urls: "not-array" }, ctx);
    expect(result.success).toBe(false);
  });

  test("includes durationMs", async () => {
    const result = await compareData({ urls: [] }, ctx);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("returns path as dom", async () => {
    const result = await compareData({ urls: [] }, ctx);
    expect(result.path).toBe("dom");
  });
});
