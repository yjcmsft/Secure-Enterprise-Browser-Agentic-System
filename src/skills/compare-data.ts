import { randomUUID } from "node:crypto";
import type { SkillExecutionContext, SkillResult } from "../types/skills.js";
import { detectBotBlock, isSecEdgarUrl, extractTickerFromUrl, extractCikFromUrl } from "../api/bot-detector.js";
import { SecEdgarConnector } from "../api/sec-edgar-connector.js";
import { featureFlags } from "../feature-flags.js";
import { extractContent } from "./extract-content.js";
import { navigatePage } from "./navigate-page.js";

const secEdgar = new SecEdgarConnector();

/**
 * Compare data from multiple URLs by navigating to each source in an isolated
 * browser session, extracting content, then compiling results into a unified
 * comparison table.
 *
 * Each URL gets its own sessionId to avoid the shared-page race condition where
 * concurrent `navigatePage` calls would overwrite each other's pages.
 *
 * **Bot-detection fallback:** If a page returns a bot-detection page (e.g., SEC
 * EDGAR blocking automated tools), the skill automatically falls back to the
 * SEC EDGAR XBRL API for structured financial data extraction.
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
        // Proactive SEC EDGAR API path — skip browser entirely for known SEC URLs
        if (featureFlags.botDetectionFallback && isSecEdgarUrl(url)) {
          const ticker = extractTickerFromUrl(url);
          const cik = extractCikFromUrl(url);
          const identifier = ticker ?? cik;

          if (identifier) {
            const secData = await secEdgar.extractFinancialSummary(identifier);
            return {
              url,
              success: true,
              extracted: secData,
              path: "api" as const,
              fallbackUsed: "sec-edgar-api" as const,
            };
          }
        }

        // Standard DOM path
        await navigatePage({ url }, isolatedContext);
        const extracted = await extractContent({ mode }, isolatedContext);

        // Post-extraction bot detection — check if we got a challenge page
        if (featureFlags.botDetectionFallback && extracted.data) {
          const htmlContent = extractHtmlFromResult(extracted.data);
          if (htmlContent) {
            const detection = detectBotBlock(htmlContent);
            if (detection.blocked && detection.suggestedFallback === "sec-edgar-api") {
              const ticker = extractTickerFromUrl(url);
              const cik = extractCikFromUrl(url);
              const identifier = ticker ?? cik;

              if (identifier) {
                const secData = await secEdgar.extractFinancialSummary(identifier);
                return {
                  url,
                  success: true,
                  extracted: secData,
                  path: "api" as const,
                  fallbackUsed: "sec-edgar-api" as const,
                  botDetected: {
                    provider: detection.provider,
                    reason: detection.reason,
                  },
                };
              }
            }
          }
        }

        return {
          url,
          success: true,
          extracted: extracted.data,
          path: extracted.path ?? ("dom" as const),
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

  const anyApi = comparisons.some(
    (c) => "path" in c && c.path === "api",
  );

  return {
    skill: "compare_data",
    success: comparisons.some((c) => c.success),
    data: { comparisons },
    path: anyApi ? "api" : "dom",
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Attempt to extract raw HTML text from an extraction result for bot-detection scanning.
 */
function extractHtmlFromResult(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  // textBlocks from DOM extraction
  if (Array.isArray(obj.textBlocks)) {
    return (obj.textBlocks as string[]).join(" ");
  }

  // Nested data with textBlocks
  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;
    if (Array.isArray(nested.textBlocks)) {
      return (nested.textBlocks as string[]).join(" ");
    }
  }

  // Raw text field
  if (typeof obj.text === "string") {
    return obj.text;
  }

  return null;
}
