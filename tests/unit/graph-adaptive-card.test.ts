import { describe, expect, test } from "vitest";
import { createAdaptiveCard } from "../../src/graph/create-adaptive-card.js";
import type { SkillExecutionContext } from "../../src/types/skills.js";

const ctx: SkillExecutionContext = { userId: "user1", sessionId: "s1" };

describe("createAdaptiveCard", () => {
  test("creates card with default title", async () => {
    const result = await createAdaptiveCard({}, ctx);
    expect(result.skill).toBe("create_adaptive_card");
    expect(result.success).toBe(true);
    expect(result.path).toBe("graph");
    expect(result.data).toHaveProperty("type", "AdaptiveCard");
    expect(result.data).toHaveProperty("version", "1.5");
    expect((result.data as Record<string, unknown[]>).body[0]).toEqual({
      type: "TextBlock",
      text: "Summary",
      weight: "Bolder",
      size: "Medium",
    });
  });

  test("creates card with custom title", async () => {
    const result = await createAdaptiveCard({ title: "Report" }, ctx);
    expect((result.data as Record<string, unknown[]>).body[0]).toHaveProperty("text", "Report");
  });

  test("includes custom body elements", async () => {
    const bodyItems = [{ type: "TextBlock", text: "Hello" }];
    const result = await createAdaptiveCard({ title: "Test", body: bodyItems }, ctx);
    const body = (result.data as Record<string, unknown[]>).body;
    expect(body).toHaveLength(2);
    expect(body[1]).toEqual({ type: "TextBlock", text: "Hello" });
  });

  test("handles empty body array", async () => {
    const result = await createAdaptiveCard({ body: [] }, ctx);
    const body = (result.data as Record<string, unknown[]>).body;
    expect(body).toHaveLength(1);
  });

  test("treats non-array body as empty", async () => {
    const result = await createAdaptiveCard({ body: "not-array" }, ctx);
    const body = (result.data as Record<string, unknown[]>).body;
    expect(body).toHaveLength(1);
  });

  test("includes durationMs", async () => {
    const result = await createAdaptiveCard({}, ctx);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
