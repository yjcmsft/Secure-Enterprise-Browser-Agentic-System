import { describe, expect, test, vi, beforeEach } from "vitest";
import { FabricClient } from "../../src/fabric-client.js";

// Mock Azure Identity
const mockCredential = {
  getToken: vi.fn().mockResolvedValue({ token: "mock-fabric-token" }),
};

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn().mockImplementation(() => mockCredential),
}));

// Mock axios
const mockAxiosInstance = {
  post: vi.fn().mockResolvedValue({ data: { id: "run-1" } }),
  get: vi.fn().mockResolvedValue({ data: { results: [{ count: 42 }] } }),
};

vi.mock("axios", () => ({
  default: {
    create: vi.fn().mockReturnValue(mockAxiosInstance),
    request: vi.fn(),
    post: vi.fn(),
    isAxiosError: vi.fn().mockReturnValue(false),
  },
}));

describe("FabricClient (enabled)", () => {
  let client: FabricClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new FabricClient(
      { workspaceId: "ws-1", lakehouseId: "lh-1", enabled: true },
      mockCredential as never,
    );
  });

  test("isEnabled returns true", () => {
    expect(client.isEnabled()).toBe(true);
  });

  test("loadTableRows sends data to Fabric API", async () => {
    const result = await client.loadTableRows("audit_events", [
      { id: "1", action: "navigate" },
    ]);
    expect(result.rowsLoaded).toBe(1);
    expect(mockAxiosInstance.post).toHaveBeenCalled();
  });

  test("loadTableRows sends correct URL structure", async () => {
    await client.loadTableRows("skill_metrics", [{ id: "m1" }]);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      "/workspaces/ws-1/lakehouses/lh-1/tables/skill_metrics/load",
      expect.objectContaining({ mode: "Append" }),
    );
  });

  test("triggerPipeline with configured pipeline", async () => {
    const clientWithPipeline = new FabricClient(
      { workspaceId: "ws-1", lakehouseId: "lh-1", pipelineId: "pipe-1", enabled: true },
      mockCredential as never,
    );
    const result = await clientWithPipeline.triggerPipeline();
    expect(result).toBeDefined();
    expect(result!.runId).toBeDefined();
  });

  test("triggerPipeline with explicit pipelineId", async () => {
    const result = await client.triggerPipeline("pipe-override");
    expect(result).toBeDefined();
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      expect.stringContaining("pipe-override"),
    );
  });

  test("triggerPipeline returns null when no pipeline configured", async () => {
    const result = await client.triggerPipeline();
    expect(result).toBeNull();
  });

  test("queryAnalytics returns results", async () => {
    const result = await client.queryAnalytics("SELECT COUNT(*) FROM audit_events");
    expect(result).toEqual([{ count: 42 }]);
  });

  test("resetClient allows re-authentication", async () => {
    await client.loadTableRows("test", [{ id: "1" }]);
    client.resetClient();
    await client.loadTableRows("test", [{ id: "2" }]);
    // Token should have been requested again
    expect(mockCredential.getToken).toHaveBeenCalledTimes(2);
  });
});
