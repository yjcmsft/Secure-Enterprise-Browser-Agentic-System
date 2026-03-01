import { randomUUID } from "node:crypto";
import type { SkillExecutionContext, SkillResult } from "../types/skills.js";
import { extractContent } from "./extract-content.js";
import { navigatePage } from "./navigate-page.js";

/**
 * Compare data from multiple URLs by navigating to each source in an isolated
 * browser session, extracting content, then compiling results into a unified
 * comparison table.
 *
 * Each URL gets its own sessionId to avoid the shared-page race condition where
 * concurrent `navigatePage` calls would overwrite each other's pages.
 */
export async function compareData(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  const urls = Array.isArray(params.urls) ? (params.urls as string[]) : [];
  const mode = params.mode ?? "all";

  if (urls.length === 0) {
    return {
      skill: "compare_data",
      success: false,
      error: "urls must contain at least one entry",
      data: { comparisons: [] },
      path: "dom",
      durationMs: Date.now() - startedAt,
    };
  }

  // Extract from each URL using an isolated session to prevent page overwrites.
  // We use Promise.all safely because each invocation has its own sessionId.
  const comparisons = await Promise.all(
    urls.map(async (url, index) => {
      const isolatedContext: SkillExecutionContext = {
        ...context,
        sessionId: `${context.sessionId}-compare-${index}-${randomUUID().slice(0, 8)}`,
      };

      try {
        await navigatePage({ url }, isolatedContext);
        const extracted = await extractContent({ mode }, isolatedContext);
        return {
          url,
          success: true,
          extracted: extracted.data,
        };
      } catch (err) {
        return {
          url,
          success: false,
          error: (err as Error).message,
          extracted: null,
        };
      }
    }),
  );

  return {
    skill: "compare_data",
    success: comparisons.some((c) => c.success),
    data: { comparisons },
    path: "dom",
    durationMs: Date.now() - startedAt,
  };
}
