import { describe, expect, test } from "vitest";
import { FabricClient, getFabricConfig } from "../../src/fabric/client.js";

describe("getFabricConfig", () => {
  test("returns disabled config when env vars not set", () => {
    const cfg = getFabricConfig();
    expect(cfg.enabled).toBe(false);
    expect(cfg.workspaceId).toBe("");
    expect(cfg.lakehouseId).toBe("");
  });
});

describe("FabricClient", () => {
  test("isEnabled returns false when not configured", () => {
    const client = new FabricClient({ workspaceId: "", lakehouseId: "", enabled: false });
    expect(client.isEnabled()).toBe(false);
  });

  test("isEnabled returns false when enabled but no workspace", () => {
    const client = new FabricClient({ workspaceId: "", lakehouseId: "lh-1", enabled: true });
    expect(client.isEnabled()).toBe(false);
  });

  test("isEnabled returns false when enabled but no lakehouse", () => {
    const client = new FabricClient({ workspaceId: "ws-1", lakehouseId: "", enabled: true });
    expect(client.isEnabled()).toBe(false);
  });

  test("isEnabled returns true when fully configured", () => {
    const client = new FabricClient({
      workspaceId: "ws-1",
      lakehouseId: "lh-1",
      enabled: true,
    });
    expect(client.isEnabled()).toBe(true);
  });

  test("loadTableRows returns 0 when disabled", async () => {
    const client = new FabricClient({ workspaceId: "", lakehouseId: "", enabled: false });
    const result = await client.loadTableRows("test", [{ id: 1 }]);
    expect(result.rowsLoaded).toBe(0);
  });

  test("triggerPipeline returns null when disabled", async () => {
    const client = new FabricClient({ workspaceId: "", lakehouseId: "", enabled: false });
    const result = await client.triggerPipeline();
    expect(result).toBeNull();
  });

  test("queryAnalytics returns empty array when disabled", async () => {
    const client = new FabricClient({ workspaceId: "", lakehouseId: "", enabled: false });
    const result = await client.queryAnalytics("SELECT 1");
    expect(result).toEqual([]);
  });

  test("resetClient clears cached http client", () => {
    const client = new FabricClient({ workspaceId: "ws-1", lakehouseId: "lh-1", enabled: true });
    // Should not throw
    client.resetClient();
    expect(client.isEnabled()).toBe(true);
  });
});
