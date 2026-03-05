import { describe, expect, test, vi, beforeEach } from "vitest";
import { SecurityGate } from "../../../src/security/index.js";
import type { SkillExecutionContext } from "../../../src/types/skills.js";

const { MockAuthDelegation, MockContentSafetyGuard, MockAuditLogger } = vi.hoisted(() => ({
  MockAuthDelegation: vi.fn(function MockAuthDelegation() {
    return {
      getDelegatedToken: vi.fn().mockResolvedValue("mock-token"),
      checkReadiness: vi.fn().mockResolvedValue({ keyVault: "skipped" }),
    };
  }),
  MockContentSafetyGuard: vi.fn(function MockContentSafetyGuard() {
    return {
      screenInput: vi.fn().mockResolvedValue({ allowed: true, blockedCategories: [] }),
      screenOutput: vi.fn().mockResolvedValue({
        allowed: true,
        blockedCategories: [],
        redactedText: null,
      }),
    };
  }),
  MockAuditLogger: vi.fn(function MockAuditLogger() {
    return {
      log: vi.fn().mockResolvedValue(undefined),
      checkReadiness: vi.fn().mockResolvedValue({ auditStore: "skipped" }),
    };
  }),
}));

// Mock dependencies to test SecurityGate in isolation
vi.mock("../../../src/security/auth-delegation.js", () => ({
  AuthDelegation: MockAuthDelegation,
}));

vi.mock("../../../src/security/content-safety.js", () => ({
  ContentSafetyGuard: MockContentSafetyGuard,
}));

vi.mock("../../../src/security/audit-logger.js", () => ({
  AuditLogger: MockAuditLogger,
}));

describe("SecurityGate.executeWithSecurity", () => {
  let gate: SecurityGate;
  const ctx: SkillExecutionContext = { userId: "user1", sessionId: "s1", requestId: "req-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    gate = new SecurityGate(["https://*.example.com/*", "https://allowed.com/*"]);
  });

  test("allows execution for allowed URL and read skill", async () => {
    const result = await gate.executeWithSecurity(
      "navigate_page",
      { url: "https://app.example.com/page" },
      ctx,
      async () => ({ data: { title: "Page" }, path: "dom" as const }),
    );
    expect(result.data).toEqual({ title: "Page" });
    expect(result.path).toBe("dom");
  });

  test("blocks disallowed URL", async () => {
    await expect(
      gate.executeWithSecurity(
        "navigate_page",
        { url: "https://evil.com/hack" },
        ctx,
        async () => ({ data: {}, path: "dom" as const }),
      ),
    ).rejects.toThrow("URL blocked by allowlist");
  });

  test("allows execution without URL param", async () => {
    const result = await gate.executeWithSecurity(
      "extract_content",
      { mode: "all" },
      ctx,
      async () => ({ data: { text: "hello" }, path: "dom" as const }),
    );
    expect(result.data).toEqual({ text: "hello" });
  });

  test("passes delegated token to handler", async () => {
    let receivedToken = "";
    await gate.executeWithSecurity(
      "navigate_page",
      {},
      ctx,
      async (token) => {
        receivedToken = token;
        return { data: {}, path: "dom" as const };
      },
    );
    expect(receivedToken).toBe("mock-token");
  });

  test("returns result path from handler", async () => {
    const result = await gate.executeWithSecurity(
      "discover_apis",
      {},
      ctx,
      async () => ({ data: { endpoints: [] }, path: "api" as const }),
    );
    expect(result.path).toBe("api");
  });
});
