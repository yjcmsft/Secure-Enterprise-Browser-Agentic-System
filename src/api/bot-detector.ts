/**
 * Bot Detection — detects when a website returns a bot-detection / CAPTCHA page
 * instead of real content. Used to trigger the dual-path API fallback.
 *
 * Common indicators:
 * - SEC EDGAR returns "Your Request Originates from an Undeclared Automated Tool"
 * - Cloudflare challenge pages
 * - CAPTCHA / reCAPTCHA / hCaptcha pages
 * - HTTP 403/429 with challenge body
 */

import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

export interface BotDetectionResult {
  blocked: boolean;
  provider: string | null;
  reason: string | null;
  suggestedFallback: "sec-edgar-api" | "api-generic" | null;
}

/**
 * Patterns that indicate the page content is a bot-detection / challenge page
 * rather than real application content.
 */
const BOT_DETECTION_PATTERNS: Array<{
  pattern: RegExp;
  provider: string;
  reason: string;
  fallback: BotDetectionResult["suggestedFallback"];
}> = [
  {
    pattern: /your request originates from an undeclared automated tool/i,
    provider: "sec-edgar",
    reason: "SEC EDGAR automated tool detection",
    fallback: "sec-edgar-api",
  },
  {
    pattern: /to allow for equitable access to .+SEC.gov/i,
    provider: "sec-edgar",
    reason: "SEC EDGAR rate limiting / bot block",
    fallback: "sec-edgar-api",
  },
  {
    pattern: /sec\.gov.+automated.+tool/i,
    provider: "sec-edgar",
    reason: "SEC EDGAR bot detection page",
    fallback: "sec-edgar-api",
  },
  {
    pattern: /request rate .+exceeded.+sec\.gov/i,
    provider: "sec-edgar",
    reason: "SEC EDGAR rate limit exceeded",
    fallback: "sec-edgar-api",
  },
  {
    pattern: /blocked.+automated.+access.+filings/i,
    provider: "sec-edgar",
    reason: "SEC EDGAR filing access blocked",
    fallback: "sec-edgar-api",
  },
  {
    pattern: /checking your browser before accessing/i,
    provider: "cloudflare",
    reason: "Cloudflare browser challenge",
    fallback: "api-generic",
  },
  {
    pattern: /challenge-platform.*cloudflare/i,
    provider: "cloudflare",
    reason: "Cloudflare challenge platform",
    fallback: "api-generic",
  },
  {
    pattern: /g-recaptcha|grecaptcha|hcaptcha/i,
    provider: "captcha",
    reason: "CAPTCHA challenge detected",
    fallback: "api-generic",
  },
  {
    pattern: /access denied.+automated/i,
    provider: "generic",
    reason: "Generic automated access denial",
    fallback: "api-generic",
  },
];

/**
 * Detect whether a page's HTML content is a bot-detection / challenge page.
 * Returns structured info about the detection for logging and fallback routing.
 */
export function detectBotBlock(html: string): BotDetectionResult {
  for (const entry of BOT_DETECTION_PATTERNS) {
    if (entry.pattern.test(html)) {
      logger.warn("bot-detection-triggered", {
        provider: entry.provider,
        reason: entry.reason,
        fallback: entry.fallback,
      });

      return {
        blocked: true,
        provider: entry.provider,
        reason: entry.reason,
        suggestedFallback: entry.fallback,
      };
    }
  }

  return {
    blocked: false,
    provider: null,
    reason: null,
    suggestedFallback: null,
  };
}

/**
 * Check if a URL belongs to SEC EDGAR (the SEC's filing system).
 * Used to proactively prefer the XBRL API path for known SEC domains.
 */
export function isSecEdgarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "sec.gov" ||
      host === "www.sec.gov" ||
      host === "edgar.sec.gov" ||
      host === "efts.sec.gov" ||
      host === "data.sec.gov" ||
      host.endsWith(".sec.gov")
    );
  } catch {
    return false;
  }
}

/**
 * Extract a CIK (Central Index Key) number from a SEC EDGAR URL.
 * CIK is the unique identifier for each filer on SEC EDGAR.
 *
 * Example URLs:
 *   https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193
 *   https://www.sec.gov/cgi-bin/browse-edgar?company=apple&CIK=320193
 *   https://edgar.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=AAPL
 */
export function extractCikFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const cikParam = parsed.searchParams.get("CIK") ?? parsed.searchParams.get("cik");
    if (cikParam) {
      return cikParam.replace(/^0+/, "") || cikParam;
    }

    // Try path-based CIK: /cgi-bin/browse-edgar?...&CIK=AAPL
    // or /edgar/data/320193/...
    const pathMatch = parsed.pathname.match(/\/edgar\/data\/(\d+)/);
    if (pathMatch) {
      return pathMatch[1]!;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract a company ticker symbol from a SEC EDGAR URL.
 * Tickers can appear as the CIK parameter value (when non-numeric).
 */
export function extractTickerFromUrl(url: string): string | null {
  const cik = extractCikFromUrl(url);
  if (cik && /^[A-Za-z]+$/.test(cik)) {
    return cik.toUpperCase();
  }
  return null;
}
