import { describe, expect, test } from "vitest";
import { ContentSafetyGuard } from "../../../src/security/content-safety.js";

describe("ContentSafetyGuard fallback", () => {
  const guard = new ContentSafetyGuard();

  test("blocks input containing SSN pattern", async () => {
    const result = await guard.screenInput("My SSN is 123-45-6789");
    expect(result.allowed).toBe(false);
    expect(result.blockedCategories).toContain("sensitive_blocked");
  });

  test("blocks input containing credit card number", async () => {
    const result = await guard.screenInput("Card: 4111 1111 1111 1111");
    expect(result.allowed).toBe(false);
    expect(result.blockedCategories).toContain("sensitive_blocked");
  });

  test("allows safe text", async () => {
    const result = await guard.screenInput("Show me the quarterly earnings report");
    expect(result.allowed).toBe(true);
    expect(result.blockedCategories).toHaveLength(0);
  });

  test("redacts email addresses in output", async () => {
    const result = await guard.screenOutput("Contact alice@example.com for details");
    expect(result.allowed).toBe(true);
    expect(result.redactedText).toContain("[REDACTED]");
    expect(result.redactedText).not.toContain("alice@example.com");
  });

  test("redacts phone numbers in output", async () => {
    const result = await guard.screenOutput("Call +1 (555) 123-4567 for support");
    expect(result.allowed).toBe(true);
    expect(result.redactedText).toContain("[REDACTED]");
  });
});
