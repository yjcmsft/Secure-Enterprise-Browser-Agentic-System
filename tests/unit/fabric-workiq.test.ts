import { describe, expect, test } from "vitest";
import { WorkIQConnector } from "../../src/fabric-workiq.js";
import { FabricClient } from "../../src/fabric-client.js";

function createDisabledClient(): FabricClient {
  return new FabricClient({ workspaceId: "", lakehouseId: "", enabled: false });
}

describe("WorkIQConnector", () => {
  const connector = new WorkIQConnector(createDisabledClient());

  test("calculateTimeSaved for known skill", () => {
    const result = connector.calculateTimeSaved("navigate_page", 2000);
    expect(result.manualEstimateSeconds).toBe(15);
    expect(result.savedSeconds).toBe(13); // 15 - 2 = 13
  });

  test("calculateTimeSaved returns 0 when agent is slower", () => {
    const result = connector.calculateTimeSaved("navigate_page", 20_000);
    expect(result.savedSeconds).toBe(0); // agent took 20s, manual is 15s
  });

  test("calculateTimeSaved uses 30s default for unknown skills", () => {
    const result = connector.calculateTimeSaved("unknown_skill", 5000);
    expect(result.manualEstimateSeconds).toBe(30);
    expect(result.savedSeconds).toBe(25);
  });

  test("calculateTimeSaved for orchestrate_workflow", () => {
    const result = connector.calculateTimeSaved("orchestrate_workflow", 10_000);
    expect(result.manualEstimateSeconds).toBe(300);
    expect(result.savedSeconds).toBe(290);
  });

  test("calculateTimeSaved for compare_data", () => {
    const result = connector.calculateTimeSaved("compare_data", 5000);
    expect(result.manualEstimateSeconds).toBe(180);
    expect(result.savedSeconds).toBe(175);
  });

  test("getManualEstimate returns known skill estimate", () => {
    expect(connector.getManualEstimate("extract_content")).toBe(45);
    expect(connector.getManualEstimate("fill_form")).toBe(60);
    expect(connector.getManualEstimate("submit_action")).toBe(30);
  });

  test("getManualEstimate returns 30 for unknown skill", () => {
    expect(connector.getManualEstimate("something_new")).toBe(30);
  });

  test("recordProductivityEvent does not throw when disabled", async () => {
    await expect(
      connector.recordProductivityEvent({
        userId: "user1",
        timestamp: new Date().toISOString(),
        metricType: "time_saved",
        value: 30,
        unit: "seconds",
        source: "browser_agent",
        metadata: {},
      }),
    ).resolves.toBeUndefined();
  });

  test("recordWorkflowCompletion returns metrics", async () => {
    const metrics = await connector.recordWorkflowCompletion(
      "user1",
      "navigate_page",
      2000,
      true,
    );
    expect(metrics.timeSavedMinutes).toBeGreaterThan(0);
    expect(metrics.errorReductionPercent).toBe(95);
    expect(metrics.automatedWorkflows).toBe(1);
    expect(metrics.manualStepsEliminated).toBe(1);
  });

  test("recordWorkflowCompletion for failed workflow", async () => {
    const metrics = await connector.recordWorkflowCompletion(
      "user1",
      "fill_form",
      5000,
      false,
    );
    expect(metrics.errorReductionPercent).toBe(0);
    expect(metrics.collaborationVelocity).toBe(0);
    expect(metrics.manualStepsEliminated).toBe(0);
  });

  test("getProductivityInsights returns empty when disabled", async () => {
    const result = await connector.getProductivityInsights("user1");
    expect(result).toEqual([]);
  });

  test("getProductivityInsights without userId filter", async () => {
    const result = await connector.getProductivityInsights();
    expect(result).toEqual([]);
  });
});
