import ContentSafetyClient, { isUnexpected } from "@azure-rest/ai-content-safety";
import { DefaultAzureCredential } from "@azure/identity";
import { config } from "../config.js";
import type { ContentSafetyResult } from "../types/security.js";

const BLOCK_PATTERNS = [/\b\d{3}-\d{2}-\d{4}\b/g, /\b(?:\d[ -]*?){13,19}\b/g];

/**
 * Common two-word capitalized phrases that should NOT be redacted as person
 * names. This prevents over-redaction of financial/business terms like
 * "Annual Report", "Operating Income", etc.
 */
const NAME_WHITELIST = new Set([
  "annual report", "operating income", "net income", "total revenue",
  "gross profit", "fiscal year", "balance sheet", "cash flow",
  "board directors", "executive summary", "key findings",
  "new york", "san francisco", "los angeles", "united states",
  "united kingdom", "hong kong", "south korea", "north america",
  "south america", "central park", "wall street",
  "general manager", "vice president", "chief officer",
  "best practices", "next steps", "action items", "data analysis",
  "project management", "customer service", "human resources",
  "machine learning", "artificial intelligence", "deep learning",
  "open source", "first quarter", "second quarter", "third quarter",
  "fourth quarter", "year end", "tax return", "real estate",
  "health care", "high school", "public health", "web application",
]);

/**
 * Name-like pattern that matches sequences of 2-3 capitalized words.
 * The replacement function checks against the whitelist to avoid
 * redacting common business/geographic phrases.
 */
const NAME_PATTERN = /\b[A-Z][a-z]{1,15}(?:\s[A-Z][a-z]{1,15}){1,2}\b/g;

const REDACT_PATTERNS = [
  /\b[\w.-]+@[\w.-]+\.\w{2,}\b/g,
  /\b\+?\d[\d\s().-]{7,}\d\b/g,
];

export class ContentSafetyGuard {
  private client = this.createClient();

  public async screenInput(text: string): Promise<ContentSafetyResult> {
    return this.evaluate(text);
  }

  public async screenOutput(text: string): Promise<ContentSafetyResult> {
    return this.evaluate(text);
  }

  private async evaluate(text: string): Promise<ContentSafetyResult> {
    const serviceResult = await this.evaluateWithService(text);
    if (serviceResult) {
      return serviceResult;
    }

    return this.evaluateFallback(text);
  }

  private async evaluateWithService(text: string): Promise<ContentSafetyResult | null> {
    if (!this.client) {
      return null;
    }

    try {
      const response = await this.client.path("/text:analyze").post({ body: { text } });
      if (isUnexpected(response)) {
        return null;
      }

      const blockedCategories = response.body.categoriesAnalysis
        .filter(
          (category) =>
            (category.severity ?? 0) >= config.CONTENT_SAFETY_BLOCK_THRESHOLD,
        )
        .map((category) => category.category);

      if (blockedCategories.length > 0) {
        return { allowed: false, blockedCategories };
      }

      return {
        allowed: true,
        blockedCategories: [],
        redactedText: this.redact(text),
      };
    } catch {
      return null;
    }
  }

  private evaluateFallback(text: string): ContentSafetyResult {
    const blockedCategories: string[] = [];
    for (const pattern of BLOCK_PATTERNS) {
      if (pattern.test(text)) {
        blockedCategories.push("sensitive_blocked");
      }
    }

    if (blockedCategories.length > 0) {
      return { allowed: false, blockedCategories };
    }

    return {
      allowed: true,
      blockedCategories,
      redactedText: this.redact(text),
    };
  }

  private redact(text: string): string {
    let redactedText = text;
    for (const pattern of REDACT_PATTERNS) {
      redactedText = redactedText.replace(pattern, "[REDACTED]");
    }
    // Redact name-like sequences, skipping whitelisted phrases.
    // When a 3-word match isn't whitelisted, check if any 2-word sub-phrase is
    // whitelisted before redacting — this prevents "The New York" from eating
    // the whitelisted "New York".
    redactedText = redactedText.replace(NAME_PATTERN, (match) => {
      if (NAME_WHITELIST.has(match.toLowerCase())) {
        return match;
      }
      // For 3-word matches, check if the last 2 or first 2 words are whitelisted
      const words = match.split(" ");
      if (words.length === 3) {
        const lastTwo = `${words[1]} ${words[2]}`;
        const firstTwo = `${words[0]} ${words[1]}`;
        if (NAME_WHITELIST.has(lastTwo.toLowerCase())) {
          return `[REDACTED] ${lastTwo}`;
        }
        if (NAME_WHITELIST.has(firstTwo.toLowerCase())) {
          return `${firstTwo} [REDACTED]`;
        }
      }
      return "[REDACTED]";
    });
    return redactedText;
  }

  private createClient(): ReturnType<typeof ContentSafetyClient> | undefined {
    if (!config.CONTENT_SAFETY_ENDPOINT) {
      return undefined;
    }
    return ContentSafetyClient(config.CONTENT_SAFETY_ENDPOINT, new DefaultAzureCredential());
  }
}
