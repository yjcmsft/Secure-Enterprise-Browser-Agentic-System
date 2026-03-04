import { describe, expect, test } from "vitest";
import { SecurityGate } from "../../../src/security/index.js";

describe("SecurityGate", () => {
  test("creates with allowlist patterns", () => {
    const gate = new SecurityGate(["https://*.microsoft.com/*"]);
    expect(gate).toBeDefined();
  });

  test("getApprovalGate returns the approval gate", () => {
    const gate = new SecurityGate(["https://*.microsoft.com/*"]);
    const approvalGate = gate.getApprovalGate();
    expect(approvalGate).toBeDefined();
  });

  test("getAuditLogger returns the audit logger", () => {
    const gate = new SecurityGate(["https://*.microsoft.com/*"]);
    const auditLogger = gate.getAuditLogger();
    expect(auditLogger).toBeDefined();
  });

  test("checkReadiness returns readiness statuses", async () => {
    const gate = new SecurityGate(["https://*.microsoft.com/*"]);
    const readiness = await gate.checkReadiness();
    expect(readiness).toHaveProperty("keyVault");
    expect(readiness).toHaveProperty("auditStore");
    // Without Azure config, both should be "skipped"
    expect(readiness.keyVault).toBe("skipped");
    expect(readiness.auditStore).toBe("skipped");
  });
});
