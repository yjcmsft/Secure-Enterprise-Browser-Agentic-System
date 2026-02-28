import { describe, expect, test } from "vitest";
import { AuditLogger } from "../../../src/security/audit-logger.js";

describe("AuditLogger", () => {
  test("stores log entries in memory when Cosmos is not configured", async () => {
    const logger = new AuditLogger();
    await logger.log({
      userId: "u1",
      sessionId: "s1",
      skillName: "navigate_page",
      action: "navigate",
      params: { url: "https://example.com" },
      result: { success: true },
      durationMs: 42,
      path: "dom",
      approvalRequired: false,
      approved: true,
    });

    const logs = logger.getInMemoryLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.id).toBeDefined();
    expect(logs[0]?.timestamp).toBeDefined();
    expect(logs[0]?.skillName).toBe("navigate_page");
    expect(logs[0]?.userId).toBe("u1");
    expect(logs[0]?.durationMs).toBe(42);
  });

  test("log entries include optional correlation fields", async () => {
    const logger = new AuditLogger();
    await logger.log({
      userId: "u2",
      sessionId: "s2",
      skillName: "fill_form",
      action: "fill",
      params: {},
      result: { success: false },
      durationMs: 10,
      path: "dom",
      approvalRequired: true,
      approved: false,
      requestId: "req-abc",
      conversationId: "conv-xyz",
      errorCode: "APPROVAL_DENIED",
      deniedReason: "User rejected",
    });

    const logs = logger.getInMemoryLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.requestId).toBe("req-abc");
    expect(logs[0]?.conversationId).toBe("conv-xyz");
    expect(logs[0]?.errorCode).toBe("APPROVAL_DENIED");
    expect(logs[0]?.deniedReason).toBe("User rejected");
  });

  test("checkReadiness returns skipped when Cosmos is not configured", async () => {
    const logger = new AuditLogger();
    const result = await logger.checkReadiness();
    expect(result.auditStore).toBe("skipped");
  });
});
