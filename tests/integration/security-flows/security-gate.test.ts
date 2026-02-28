import { describe, expect, test, vi } from "vitest";
import { SecurityError } from "../../../src/security/errors.js";
import { SecurityGate } from "../../../src/security/index.js";

describe("SecurityGate observability", () => {
  test("audits allowlist-denied action with structured error code", async () => {
    const gate = new SecurityGate(["https://*.microsoft.com/*"]);
    const handler = vi.fn(async () => ({ data: { ok: true }, path: "dom" as const }));

    await expect(
      gate.executeWithSecurity(
        "navigate_page",
        { url: "https://example.com/blocked" },
        {
          userId: "u1",
          sessionId: "s1",
          requestId: "req-123",
          conversationId: "conv-456",
        },
        handler,
      ),
    ).rejects.toBeInstanceOf(SecurityError);

    expect(handler).not.toHaveBeenCalled();

    const logs = gate.getAuditLogger().getInMemoryLogs();
    expect(logs.length).toBe(1);
    expect(logs[0]?.errorCode).toBe("URL_NOT_ALLOWED");
    expect(logs[0]?.approved).toBe(true);
    expect(logs[0]?.result.success).toBe(false);
    expect(logs[0]?.requestId).toBe("req-123");
    expect(logs[0]?.conversationId).toBe("conv-456");
  });
});