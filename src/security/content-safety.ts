import ContentSafetyClient, { isUnexpected } from "@azure-rest/ai-content-safety";
import { DefaultAzureCredential } from "@azure/identity";
import { config } from "../config.js";
import type { ContentSafetyResult } from "../types/security.js";

const BLOCK_PATTERNS = [/\b\d{3}-\d{2}-\d{4}\b/g, /\b(?:\d[ -]*?){13,19}\b/g];
const REDACT_PATTERNS = [
  /\b[\w.-]+@[\w.-]+\.\w{2,}\b/g,
  /\b\+?\d[\d\s().-]{7,}\d\b/g,
  /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g,
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
    return redactedText;
  }

  private createClient(): ReturnType<typeof ContentSafetyClient> | undefined {
    if (!config.CONTENT_SAFETY_ENDPOINT) {
      return undefined;
    }
    return ContentSafetyClient(config.CONTENT_SAFETY_ENDPOINT, new DefaultAzureCredential());
  }
}
