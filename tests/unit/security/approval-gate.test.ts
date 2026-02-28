import { afterEach, describe, expect, test, vi } from "vitest";
import { ApprovalGate } from "../../../src/security/approval-gate.js";

describe("ApprovalGate timeout behavior", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("auto-denies when approval times out", async () => {
    vi.useFakeTimers();

    const gate = new ApprovalGate();
    const pending = gate.requestApproval("fill_form", "u1", "s1", "Need approval");

    expect(gate.listPending().length).toBe(1);

    await vi.advanceTimersByTimeAsync(300001);

    const result = await pending;
    expect(result.approved).toBe(false);
    expect(result.note).toContain("timeout");
    expect(gate.listPending().length).toBe(0);
  });
});
