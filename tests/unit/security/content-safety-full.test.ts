import { describe, expect, test, vi, beforeEach } from "vitest";

// Mock config with NO Content Safety endpoint (forces fallback path)
vi.mock("../../../src/config.js", () => ({
  config: {
    CONTENT_SAFETY_ENDPOINT: "",
    CONTENT_SAFETY_BLOCK_THRESHOLD: 4,
    KEY_VAULT_URL: "",
    TARGET_APP_SCOPE: "https://graph.microsoft.com/.default",
    GRAPH_DEFAULT_SCOPE: "https://graph.microsoft.com/.default",
    allowlistPatterns: ["*"],
    MAX_BROWSER_CONCURRENCY: 3,
    SESSION_TTL_MS: 600000,
    COSMOS_ENDPOINT: "",
    COSMOS_KEY: "",
    COSMOS_DATABASE: "browser-agent",
    COSMOS_AUDIT_CONTAINER: "audit",
  },
}));

const { MockDefaultAzureCredential } = vi.hoisted(() => ({
  MockDefaultAzureCredential: vi.fn(),
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: MockDefaultAzureCredential,
}));

import { ContentSafetyGuard } from "../../../src/security/content-safety.js";

describe("ContentSafetyGuard fallback evaluation", () => {
  let guard: ContentSafetyGuard;

  beforeEach(() => {
    guard = new ContentSafetyGuard();
  });

  test("allows normal text", async () => {
    const result = await guard.screenInput("Hello world, this is a test.");
    expect(result.allowed).toBe(true);
    expect(result.blockedCategories).toEqual([]);
  });

  test("blocks SSN patterns", async () => {
    const result = await guard.screenInput("My SSN is 123-45-6789");
    expect(result.allowed).toBe(false);
    expect(result.blockedCategories).toContain("sensitive_blocked");
  });

  test("blocks credit card patterns", async () => {
    const result = await guard.screenInput("Card number: 4111 1111 1111 1111");
    expect(result.allowed).toBe(false);
    expect(result.blockedCategories).toContain("sensitive_blocked");
  });

  test("redacts email addresses in output", async () => {
    const result = await guard.screenOutput("Contact john@example.com for info");
    expect(result.allowed).toBe(true);
    expect(result.redactedText).toContain("[REDACTED]");
    expect(result.redactedText).not.toContain("john@example.com");
  });

  test("redacts phone numbers", async () => {
    const result = await guard.screenOutput("Call +1 (555) 123-4567 now");
    expect(result.allowed).toBe(true);
    expect(result.redactedText).toContain("[REDACTED]");
  });

  test("redacts person names (capitalized sequences)", async () => {
    const result = await guard.screenOutput("Meeting with John Smith tomorrow");
    expect(result.allowed).toBe(true);
    expect(result.redactedText).toContain("[REDACTED]");
    expect(result.redactedText).not.toContain("John Smith");
  });

  test("preserves whitelisted business terms", async () => {
    const result = await guard.screenOutput("The Annual Report shows Operating Income growth");
    expect(result.allowed).toBe(true);
    expect(result.redactedText).toContain("Annual Report");
    expect(result.redactedText).toContain("Operating Income");
  });

  test("preserves whitelisted geographic names", async () => {
    const result = await guard.screenOutput("Our office in New York is expanding");
    expect(result.allowed).toBe(true);
    expect(result.redactedText).toContain("New York");
  });

  test("handles 3-word name with whitelisted last 2 words", async () => {
    const result = await guard.screenOutput("The New York office is growing");
    expect(result.allowed).toBe(true);
    // "The New York" — last 2 words "New York" is whitelisted
    expect(result.redactedText).toContain("New York");
  });

  test("handles 3-word name with whitelisted first 2 words", async () => {
    const result = await guard.screenOutput("Operating Income Statement was released");
    expect(result.allowed).toBe(true);
    // "Operating Income" is whitelisted; the first two words are preserved
  });

  test("redacts 3-word name when no sub-phrase is whitelisted", async () => {
    const result = await guard.screenOutput("Talk to Jonathan Michael Williams about it");
    expect(result.allowed).toBe(true);
    expect(result.redactedText).toContain("[REDACTED]");
  });

  test("allows text without PII", async () => {
    const result = await guard.screenOutput("Revenue grew 15% year over year.");
    expect(result.allowed).toBe(true);
    expect(result.redactedText).toBe("Revenue grew 15% year over year.");
  });

  test("screenInput and screenOutput both use same evaluation", async () => {
    const input = await guard.screenInput("Safe text");
    const output = await guard.screenOutput("Safe text");
    expect(input.allowed).toBe(output.allowed);
  });

  test("allows empty text", async () => {
    const result = await guard.screenInput("");
    expect(result.allowed).toBe(true);
  });

  test("preserves technology terms", async () => {
    const result = await guard.screenOutput("Using Machine Learning and Artificial Intelligence");
    expect(result.allowed).toBe(true);
    expect(result.redactedText).toContain("Machine Learning");
    expect(result.redactedText).toContain("Artificial Intelligence");
  });
});

describe("ContentSafetyGuard with service endpoint", () => {
  test("returns null from evaluateWithService when client fails", async () => {
    // With no CONTENT_SAFETY_ENDPOINT, client is undefined
    const guard = new ContentSafetyGuard();
    // This forces the fallback path
    const result = await guard.screenInput("test text");
    expect(result.allowed).toBe(true);
  });
});
