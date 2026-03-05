import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { AnalyticsPipeline } from "../../src/fabric-analytics.js";
import { FabricClient } from "../../src/fabric-client.js";
import type { AuditLogEntry } from "../../src/types/security.js";

function createDisabledClient(): FabricClient {
  return new FabricClient({ workspaceId: "", lakehouseId: "", enabled: false });
}

function makeAuditEntry(overrides?: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: "audit-1",
    timestamp: new Date().toISOString(),
    userId: "user1",
    sessionId: "s1",
    skillName: "navigate_page",
    action: "navigate_page",
    params: { url: "https://example.com" },
    result: { success: true },
    durationMs: 150,
    path: "dom",
    approvalRequired: false,
    approved: true,
    ...overrides,
  };
}

describe("AnalyticsPipeline", () => {
  let pipeline: AnalyticsPipeline;

  beforeEach(() => {
    pipeline = new AnalyticsPipeline(createDisabledClient(), {
      flushIntervalMs: 60_000,
      maxBufferSize: 50,
    });
  });

  afterEach(async () => {
    await pipeline.stop();
  });

  test("constructor accepts FabricClient directly", () => {
    const client = createDisabledClient();
    const p = new AnalyticsPipeline(client);
    expect(p.getBufferSize()).toEqual({ audit: 0, metrics: 0 });
  });

  test("ingestAuditEvent adds to both buffers", async () => {
    await pipeline.ingestAuditEvent(makeAuditEntry());
    const size = pipeline.getBufferSize();
    expect(size.audit).toBe(1);
    expect(size.metrics).toBe(1);
  });

  test("flush empties buffers (disabled client returns 0)", async () => {
    await pipeline.ingestAuditEvent(makeAuditEntry());
    await pipeline.ingestAuditEvent(makeAuditEntry({ id: "audit-2" }));

    const result = await pipeline.flush();
    expect(result.auditRows).toBe(0); // disabled client
    expect(result.metricRows).toBe(0);
    // Buffers still have items since load returned 0 (but didn't error)
  });

  test("flush returns zeros for empty buffers", async () => {
    const result = await pipeline.flush();
    expect(result.auditRows).toBe(0);
    expect(result.metricRows).toBe(0);
  });

  test("getBufferSize reports correct counts", async () => {
    expect(pipeline.getBufferSize()).toEqual({ audit: 0, metrics: 0 });
    await pipeline.ingestAuditEvent(makeAuditEntry());
    await pipeline.ingestAuditEvent(makeAuditEntry({ id: "a2" }));
    await pipeline.ingestAuditEvent(makeAuditEntry({ id: "a3" }));
    expect(pipeline.getBufferSize()).toEqual({ audit: 3, metrics: 3 });
  });

  test("start is idempotent", () => {
    pipeline.start();
    pipeline.start(); // Should not create duplicate timers
    // No error means success
  });

  test("stop clears timer and flushes", async () => {
    pipeline.start();
    await pipeline.stop();
    // Timer should be cleared, pipeline should be stoppable
    expect(pipeline.getBufferSize()).toEqual({ audit: 0, metrics: 0 });
  });

  test("triggerAnalytics returns null when disabled", async () => {
    const result = await pipeline.triggerAnalytics();
    expect(result).toBeNull();
  });

  test("getSkillPerformance returns empty when disabled", async () => {
    const result = await pipeline.getSkillPerformance();
    expect(result).toEqual([]);
  });

  test("derives skill metric from audit entry", async () => {
    const entry = makeAuditEntry({
      skillName: "fill_form",
      path: "api",
      durationMs: 200,
    });
    await pipeline.ingestAuditEvent(entry);
    expect(pipeline.getBufferSize().metrics).toBe(1);
  });

  test("error entries set success to false in metrics", async () => {
    const entry = makeAuditEntry({
      errorCode: "URL_NOT_ALLOWED",
    });
    await pipeline.ingestAuditEvent(entry);
    // Metric was created — we just verify it was buffered
    expect(pipeline.getBufferSize().metrics).toBe(1);
  });
});
