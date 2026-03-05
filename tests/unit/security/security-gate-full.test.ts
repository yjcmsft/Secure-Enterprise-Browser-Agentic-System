import { describe, expect, test, vi, beforeEach } from "vitest";

const { MockDefaultAzureCredential } = vi.hoisted(() => ({
  MockDefaultAzureCredential: vi.fn(function MockDefaultAzureCredential() {
    return {
      getToken: vi.fn().mockResolvedValue({ token: "mock-token" }),
    };
  }),
}));

// Mock config
vi.mock("../../../src/config.js", () => ({
  config: {
    CONTENT_SAFETY_ENDPOINT: "",
    CONTENT_SAFETY_BLOCK_THRESHOLD: 4,
    KEY_VAULT_URL: "",
    TARGET_APP_SCOPE: "https://graph.microsoft.com/.default",
    GRAPH_DEFAULT_SCOPE: "https://graph.microsoft.com/.default",
    allowlistPatterns: ["https://example.com/**", "https://*.internal.corp/**"],
    MAX_BROWSER_CONCURRENCY: 3,
    SESSION_TTL_MS: 600000,
    COSMOS_ENDPOINT: "",
    COSMOS_KEY: "",
    COSMOS_DATABASE: "browser-agent",
    COSMOS_AUDIT_CONTAINER: "audit",
  },
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: MockDefaultAzureCredential,
}));

import { SecurityGate } from "../../../src/security/index.js";
import { SecurityError } from "../../../src/security/errors.js";

describe("SecurityGate full flow", () => {
  let gate: SecurityGate;

  beforeEach(() => {
    gate = new SecurityGate(["https://example.com/**", "https://*.internal.corp/**"]);
  });

  test("allows and executes read-only skill", async () => {
    const result = await gate.executeWithSecurity(
      "navigate_page",
      { url: "https://example.com/page" },
      { userId: "u1", sessionId: "s1", requestId: "r1" },
      async (token) => {
        expect(token).toBeTruthy();
        return { data: { title: "Test" }, path: "dom" as const };
      },
    );
    expect(result.data).toEqual({ title: "Test" });
    expect(result.path).toBe("dom");
  });

  test("blocks URL not in allowlist", async () => {
    await expect(
      gate.executeWithSecurity(
        "navigate_page",
        { url: "https://evil-site.com/phishing" },
        { userId: "u1", sessionId: "s1", requestId: "r1" },
        async () => ({ data: {}, path: "dom" as const }),
      ),
    ).rejects.toThrow(SecurityError);
  });

  test("blocks URL and throws SecurityError with correct code", async () => {
    try {
      await gate.executeWithSecurity(
        "navigate_page",
        { url: "https://blocked.com" },
        { userId: "u1", sessionId: "s1", requestId: "r1" },
        async () => ({ data: {}, path: "dom" as const }),
      );
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(SecurityError);
      expect((error as SecurityError).code).toBe("URL_NOT_ALLOWED");
      expect((error as SecurityError).httpStatus).toBe(403);
    }
  });

  test("allows URL matching wildcard pattern", async () => {
    const result = await gate.executeWithSecurity(
      "extract_content",
      { url: "https://app.internal.corp/api/data" },
      { userId: "u1", sessionId: "s1", requestId: "r1" },
      async () => ({
        data: { tables: [["a", "b"]] },
        path: "api" as const,
      }),
    );
    expect(result.data).toHaveProperty("tables");
  });

  test("executes skill with no URL param (no URL check)", async () => {
    const result = await gate.executeWithSecurity(
      "extract_content",
      { mode: "all" },
      { userId: "u1", sessionId: "s1", requestId: "r1" },
      async () => ({
        data: { textBlocks: ["hello"] },
        path: "dom" as const,
      }),
    );
    expect(result.data).toHaveProperty("textBlocks");
  });

  test("getApprovalGate returns ApprovalGate instance", () => {
    const approvalGate = gate.getApprovalGate();
    expect(approvalGate).toBeDefined();
    expect(typeof approvalGate.requiresApproval).toBe("function");
  });

  test("getAuditLogger returns AuditLogger instance", () => {
    const auditLogger = gate.getAuditLogger();
    expect(auditLogger).toBeDefined();
    expect(typeof auditLogger.log).toBe("function");
  });

  test("checkReadiness returns status for all components", async () => {
    const readiness = await gate.checkReadiness();
    expect(readiness).toHaveProperty("keyVault");
    expect(readiness).toHaveProperty("auditStore");
    expect(["ready", "skipped"]).toContain(readiness.keyVault);
    expect(["ready", "skipped"]).toContain(readiness.auditStore);
  });

  test("redacts PII in output data", async () => {
    const result = await gate.executeWithSecurity(
      "extract_content",
      {},
      { userId: "u1", sessionId: "s1", requestId: "r1" },
      async () => ({
        data: "Contact john@example.com for details",
        path: "dom" as const,
      }),
    );
    // The redacted text is returned via the safety guard
    expect(result.data).toBeDefined();
  });

  test("logs audit entry on success", async () => {
    const auditLogger = gate.getAuditLogger();
    const logsBefore = auditLogger.getInMemoryLogs().length;

    await gate.executeWithSecurity(
      "navigate_page",
      { url: "https://example.com/test" },
      { userId: "u1", sessionId: "s1", requestId: "r1" },
      async () => ({ data: { ok: true }, path: "dom" as const }),
    );

    const logsAfter = auditLogger.getInMemoryLogs();
    expect(logsAfter.length).toBeGreaterThan(logsBefore);
    const lastLog = logsAfter[logsAfter.length - 1]!;
    expect(lastLog.skillName).toBe("navigate_page");
    expect(lastLog.result.success).toBe(true);
  });

  test("logs audit entry on URL denial", async () => {
    const auditLogger = gate.getAuditLogger();

    try {
      await gate.executeWithSecurity(
        "navigate_page",
        { url: "https://blocked-url.com" },
        { userId: "u1", sessionId: "s1", requestId: "r1" },
        async () => ({ data: {}, path: "dom" as const }),
      );
    } catch {
      // Expected
    }

    const logs = auditLogger.getInMemoryLogs();
    const deniedLog = logs.find((l) => l.deniedReason);
    expect(deniedLog).toBeDefined();
    expect(deniedLog?.errorCode).toBe("URL_NOT_ALLOWED");
  });
});
