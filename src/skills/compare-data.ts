import type { SkillExecutionContext, SkillResult } from "../types/skills.js";
import { extractContent } from "./extract-content.js";
import { navigatePage } from "./navigate-page.js";

export async function compareData(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  const urls = Array.isArray(params.urls) ? (params.urls as string[]) : [];

  const comparisons = await Promise.all(
    urls.map(async (url) => {
      await navigatePage({ url }, context);
      const extracted = await extractContent({ mode: params.mode ?? "all" }, context);
      return {
        url,
        extracted: extracted.data,
      };
    }),
  );

  return {
    skill: "compare_data",
    success: true,
    data: { comparisons },
    path: "dom",
    durationMs: Date.now() - startedAt,
  };
}
