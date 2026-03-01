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

  test("redacts person names but preserves common business phrases", async () => {
    const text = "Contact John Smith about the Annual Report and Operating Income figures";
    const result = await guard.screenOutput(text);
    expect(result.allowed).toBe(true);
    expect(result.redactedText).not.toContain("John Smith");
    expect(result.redactedText).toContain("Annual Report");
    expect(result.redactedText).toContain("Operating Income");
  });

  test("preserves geographic names in whitelist", async () => {
    const text = "The New York office prepared the United States filing";
    const result = await guard.screenOutput(text);
    expect(result.allowed).toBe(true);
    expect(result.redactedText).toContain("New York");
    expect(result.redactedText).toContain("United States");
  });
});
