import { describe, expect, test, vi, beforeEach } from "vitest";

// Hoist mock variables so they're accessible inside vi.mock() factories
const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

// Mock Content Safety client with service endpoint
vi.mock("@azure-rest/ai-content-safety", () => {
  const client = vi.fn().mockReturnValue({
    path: vi.fn().mockReturnValue({ post: mockPost }),
  });
  return {
    default: client,
    isUnexpected: vi.fn().mockReturnValue(false),
  };
});

const { MockDefaultAzureCredential } = vi.hoisted(() => ({
  MockDefaultAzureCredential: vi.fn(),
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: MockDefaultAzureCredential,
}));

vi.mock("../../../src/config.js", () => ({
  config: {
    CONTENT_SAFETY_ENDPOINT: "https://content-safety.cognitiveservices.azure.com",
    CONTENT_SAFETY_BLOCK_THRESHOLD: 4,
    KEY_VAULT_URL: "",
    TARGET_APP_SCOPE: "",
    GRAPH_DEFAULT_SCOPE: "",
    allowlistPatterns: ["*"],
    MAX_BROWSER_CONCURRENCY: 3,
    SESSION_TTL_MS: 600000,
  },
}));

import { ContentSafetyGuard } from "../../../src/security/content-safety.js";

describe("ContentSafetyGuard with Azure service", () => {
  let guard: ContentSafetyGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new ContentSafetyGuard();
  });

  test("allows text when service returns low severity", async () => {
    mockPost.mockResolvedValueOnce({
      body: {
        categoriesAnalysis: [
          { category: "Hate", severity: 0 },
          { category: "Violence", severity: 0 },
        ],
      },
    });

    const result = await guard.screenInput("Hello, how are you?");
    expect(result.allowed).toBe(true);
    expect(result.blockedCategories).toEqual([]);
  });

  test("blocks text when service returns high severity", async () => {
    mockPost.mockResolvedValueOnce({
      body: {
        categoriesAnalysis: [
          { category: "Violence", severity: 6 },
          { category: "Hate", severity: 2 },
        ],
      },
    });

    const result = await guard.screenInput("Some violent content");
    expect(result.allowed).toBe(false);
    expect(result.blockedCategories).toContain("Violence");
    expect(result.blockedCategories).not.toContain("Hate");
  });

  test("falls back to regex when service throws", async () => {
    mockPost.mockRejectedValueOnce(new Error("Service unavailable"));

    const result = await guard.screenInput("Normal text without PII");
    expect(result.allowed).toBe(true);
  });

  test("falls back when response is unexpected", async () => {
    const { isUnexpected } = await import("@azure-rest/ai-content-safety");
    vi.mocked(isUnexpected).mockReturnValueOnce(true);
    mockPost.mockResolvedValueOnce({ status: "400", body: {} });

    const result = await guard.screenInput("Test text");
    expect(result.allowed).toBe(true); // Falls back to regex
  });

  test("redacts PII in output after service approves", async () => {
    mockPost.mockResolvedValueOnce({
      body: {
        categoriesAnalysis: [{ category: "Hate", severity: 0 }],
      },
    });

    const result = await guard.screenOutput("Email: test@example.com");
    expect(result.allowed).toBe(true);
    expect(result.redactedText).toContain("[REDACTED]");
  });

  test("blocks multiple categories", async () => {
    mockPost.mockResolvedValueOnce({
      body: {
        categoriesAnalysis: [
          { category: "Violence", severity: 6 },
          { category: "SelfHarm", severity: 5 },
          { category: "Hate", severity: 1 },
        ],
      },
    });

    const result = await guard.screenInput("Bad content");
    expect(result.allowed).toBe(false);
    expect(result.blockedCategories).toContain("Violence");
    expect(result.blockedCategories).toContain("SelfHarm");
    expect(result.blockedCategories).not.toContain("Hate");
  });
});
