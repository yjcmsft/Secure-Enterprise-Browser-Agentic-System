import { describe, expect, test } from "vitest";
import { ApprovalGate } from "../../../src/security/approval-gate.js";

describe("ApprovalGate", () => {
  test("resolves pending approvals", async () => {
    const gate = new ApprovalGate();
    const approval = gate.requestApproval("fill_form", "u1", "s1", "Need approval");
    const actionId = gate.listPending()[0]?.actionId;
    expect(actionId).toBeDefined();
    if (!actionId) {
      throw new Error("No action id generated");
    }
    gate.resolveApproval({
      actionId,
      approved: true,
      resolvedAt: new Date().toISOString(),
    });
    const result = await approval;
    expect(result.approved).toBe(true);
  });
});
