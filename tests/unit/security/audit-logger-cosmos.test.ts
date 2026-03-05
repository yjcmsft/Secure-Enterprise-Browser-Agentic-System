import { describe, expect, test, vi, beforeEach } from "vitest";

// Hoist mock variables so they're accessible inside vi.mock() factories
const { mockCreate, mockRead } = vi.hoisted(() => ({
  mockCreate: vi.fn().mockResolvedValue({ resource: {} }),
  mockRead: vi.fn().mockResolvedValue({ resource: {} }),
}));

// Mock Cosmos DB
vi.mock("@azure/cosmos", () => ({
  CosmosClient: vi.fn(function CosmosClient() {
    return {
      database: vi.fn().mockReturnValue({
        container: vi.fn().mockReturnValue({
          items: { create: mockCreate },
          read: mockRead,
        }),
      }),
    };
  }),
}));

vi.mock("../../../src/config.js", () => ({
  config: {
    COSMOS_ENDPOINT: "https://test-cosmos.documents.azure.com:443/",
    COSMOS_KEY: "fake-cosmos-key",
    COSMOS_DATABASE: "browser-agent",
    COSMOS_AUDIT_CONTAINER: "audit",
    CONTENT_SAFETY_ENDPOINT: "",
    CONTENT_SAFETY_BLOCK_THRESHOLD: 4,
    KEY_VAULT_URL: "",
    TARGET_APP_SCOPE: "",
    GRAPH_DEFAULT_SCOPE: "",
    allowlistPatterns: ["*"],
    MAX_BROWSER_CONCURRENCY: 3,
    SESSION_TTL_MS: 600000,
  },
}));

import { AuditLogger } from "../../../src/security/audit-logger.js";

describe("AuditLogger with Cosmos DB", () => {
  let logger: AuditLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new AuditLogger();
  });

  test("logs entry to Cosmos DB container", async () => {
    await logger.log({
      requestId: "r1",
      userId: "u1",
      sessionId: "s1",
      skillName: "navigate_page",
      action: "navigate_page",
      params: { url: "https://example.com" },
      result: { success: true },
      durationMs: 150,
      path: "dom",
      approvalRequired: false,
      approved: true,
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const payload = mockCreate.mock.calls[0][0];
    expect(payload.id).toBeTruthy();
    expect(payload.timestamp).toBeTruthy();
    expect(payload.skillName).toBe("navigate_page");
    expect(payload.result.success).toBe(true);
  });

  test("logs multiple entries", async () => {
    await logger.log({
      requestId: "r1", userId: "u1", sessionId: "s1",
      skillName: "navigate_page", action: "navigate_page",
      params: {}, result: { success: true },
      durationMs: 50, path: "dom",
      approvalRequired: false, approved: true,
    });
    await logger.log({
      requestId: "r2", userId: "u1", sessionId: "s1",
      skillName: "extract_content", action: "extract_content",
      params: {}, result: { success: true },
      durationMs: 100, path: "dom",
      approvalRequired: false, approved: true,
    });

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  test("checkReadiness returns ready when Cosmos responds", async () => {
    mockRead.mockResolvedValueOnce({ resource: {} });
    const result = await logger.checkReadiness();
    expect(result.auditStore).toBe("ready");
  });

  test("getInMemoryLogs returns empty when using Cosmos", () => {
    const logs = logger.getInMemoryLogs();
    expect(logs).toEqual([]);
  });
});

describe("AuditLogger without Cosmos DB", () => {
  test("logs to in-memory store", async () => {
    // Override config to have no Cosmos
    vi.resetModules();
    vi.doMock("../../../src/config.js", () => ({
      config: {
        COSMOS_ENDPOINT: "",
        COSMOS_KEY: "",
        COSMOS_DATABASE: "browser-agent",
        COSMOS_AUDIT_CONTAINER: "audit",
      },
    }));

    const { AuditLogger: AuditLoggerNoDb } = await import("../../../src/security/audit-logger.js");
    const logger = new AuditLoggerNoDb();

    await logger.log({
      requestId: "r1", userId: "u1", sessionId: "s1",
      skillName: "navigate_page", action: "navigate_page",
      params: {}, result: { success: true },
      durationMs: 50, path: "dom",
      approvalRequired: false, approved: true,
    });

    const logs = logger.getInMemoryLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]!.skillName).toBe("navigate_page");
  });
});
