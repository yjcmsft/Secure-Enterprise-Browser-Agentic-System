import { describe, expect, test } from "vitest";
import { MemoryStore } from "../../../src/orchestrator/memory-store.js";

describe("MemoryStore", () => {
  test("stores and retrieves a record", async () => {
    const store = new MemoryStore();
    const record = {
      id: "mem-1",
      sessionId: "s1",
      payload: { key: "value" },
      updatedAt: new Date().toISOString(),
    };
    await store.set(record);
    const retrieved = store.get("mem-1");
    expect(retrieved).toEqual(record);
  });

  test("returns undefined for non-existent record", () => {
    const store = new MemoryStore();
    expect(store.get("nonexistent")).toBeUndefined();
  });

  test("overwrites existing record with same id", async () => {
    const store = new MemoryStore();
    const first = {
      id: "mem-1",
      sessionId: "s1",
      payload: { version: 1 },
      updatedAt: new Date().toISOString(),
    };
    const second = {
      id: "mem-1",
      sessionId: "s1",
      payload: { version: 2 },
      updatedAt: new Date().toISOString(),
    };
    await store.set(first);
    await store.set(second);
    const retrieved = store.get("mem-1");
    expect(retrieved!.payload).toEqual({ version: 2 });
  });

  test("stores records with conversationId", async () => {
    const store = new MemoryStore();
    const record = {
      id: "mem-conv",
      sessionId: "s1",
      conversationId: "conv-1",
      payload: { data: true },
      updatedAt: new Date().toISOString(),
    };
    await store.set(record);
    expect(store.get("mem-conv")!.conversationId).toBe("conv-1");
  });
});
