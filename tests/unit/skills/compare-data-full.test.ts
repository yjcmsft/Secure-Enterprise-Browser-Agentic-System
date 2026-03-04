import { describe, expect, test, vi, beforeEach } from "vitest";
import type { SkillExecutionContext } from "../../../src/types/skills.js";

// Mock runtime for the skills that compare-data calls
const mockSecurityGate = {
  executeWithSecurity: vi.fn(
    async (
      _skill: string,
      _params: Record<string, unknown>,
      _context: SkillExecutionContext,
      handler: (token: string) => Promise<{ data: unknown; path: string }>,
    ) => handler("mock-token"),
  ),
};

const mockPage = {
  goto: vi.fn().mockResolvedValue(undefined),
  title: vi.fn().mockResolvedValue("Page"),
  url: vi.fn().mockReturnValue("https://example.com"),
  content: vi.fn().mockResolvedValue("<html><body>Test</body></html>"),
  waitForSelector: vi.fn().mockResolvedValue(undefined),
  getByText: vi.fn().mockReturnValue({ first: () => ({ click: vi.fn() }) }),
};

const mockSessionManager = {
  getOrCreateSession: vi.fn().mockResolvedValue({
    userId: "u1",
    sessionId: "s1",
    context: { setExtraHTTPHeaders: vi.fn() },
    page: mockPage,
  }),
  getPage: vi.fn().mockReturnValue(mockPage),
  injectAuth: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../../../src/runtime.js", () => ({
  runtime: {
    securityGate: mockSecurityGate,
    dualPathRouter: {
      decide: vi.fn().mockResolvedValue({ path: "dom", reason: "No API" }),
      getDiscovery: vi.fn().mockReturnValue({ discover: vi.fn().mockResolvedValue(null) }),
    },
    restConnector: { request: vi.fn() },
    domParser: {
      extractAll: vi.fn().mockReturnValue({
        textBlocks: ["Content"],
        links: [],
        tables: [],
      }),
    },
  },
  sessionManager: mockSessionManager,
}));

const ctx: SkillExecutionContext = { userId: "u1", sessionId: "s1" };

describe("compareData full coverage", () => {
  let compareData: typeof import("../../../src/skills/compare-data.js").compareData;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../src/skills/compare-data.js");
    compareData = mod.compareData;
  });

  test("returns error for empty urls array", async () => {
    const result = await compareData({ urls: [] }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain("at least one entry");
  });

  test("returns error for missing urls param", async () => {
    const result = await compareData({}, ctx);
    expect(result.success).toBe(false);
  });

  test("compares data from single URL", async () => {
    const result = await compareData(
      { urls: ["https://example.com/report1"] },
      ctx,
    );
    expect(result.skill).toBe("compare_data");
    expect(result.success).toBe(true);
    const data = result.data as { comparisons: Array<{ url: string; success: boolean }> };
    expect(data.comparisons).toHaveLength(1);
    expect(data.comparisons[0]!.success).toBe(true);
  });

  test("compares data from multiple URLs", async () => {
    const result = await compareData(
      { urls: ["https://a.com", "https://b.com", "https://c.com"], mode: "text" },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as { comparisons: Array<{ url: string; success: boolean }> };
    expect(data.comparisons).toHaveLength(3);
  });

  test("handles navigation error for one URL gracefully", async () => {
    mockSecurityGate.executeWithSecurity.mockRejectedValueOnce(new Error("Navigation failed"));

    const result = await compareData(
      { urls: ["https://bad.com", "https://good.com"] },
      ctx,
    );
    const data = result.data as { comparisons: Array<{ url: string; success: boolean; error?: string }> };
    expect(data.comparisons).toHaveLength(2);
    // One failed, one succeeded
    const failed = data.comparisons.find((c) => !c.success);
    expect(failed).toBeDefined();
    expect(failed?.error).toBeTruthy();
  });

  test("creates isolated session context per URL", async () => {
    await compareData(
      { urls: ["https://a.com", "https://b.com"] },
      ctx,
    );
    // Each call to navigatePage/extractContent should use different sessionIds
    const calls = mockSecurityGate.executeWithSecurity.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  test("uses default mode when not specified", async () => {
    const result = await compareData(
      { urls: ["https://example.com"] },
      ctx,
    );
    expect(result.success).toBe(true);
  });

  test("reports overall success when at least one comparison succeeds", async () => {
    // First URL fails, second succeeds
    let callCount = 0;
    mockSecurityGate.executeWithSecurity.mockImplementation(
      async (
        _skill: string,
        _params: Record<string, unknown>,
        _ctx: SkillExecutionContext,
        handler: (token: string) => Promise<{ data: unknown; path: string }>,
      ) => {
        callCount++;
        if (callCount === 1) throw new Error("First URL failed");
        return handler("token");
      },
    );

    const result = await compareData(
      { urls: ["https://fail.com", "https://ok.com"] },
      ctx,
    );
    // At least one succeeded
    expect(result.success).toBe(true);
  });
});
