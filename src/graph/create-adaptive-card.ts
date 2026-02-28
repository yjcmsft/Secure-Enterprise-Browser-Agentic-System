import type { SkillExecutionContext, SkillResult } from "../types/skills.js";

export async function createAdaptiveCard(
  params: Record<string, unknown>,
  _context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  const title = String(params.title ?? "Summary");
  const body = Array.isArray(params.body) ? (params.body as unknown[]) : [];

  return {
    skill: "create_adaptive_card",
    success: true,
    path: "graph",
    data: {
      type: "AdaptiveCard",
      version: "1.5",
      body: [{ type: "TextBlock", text: title, weight: "Bolder", size: "Medium" }, ...body],
    },
    durationMs: Date.now() - startedAt,
  };
}
