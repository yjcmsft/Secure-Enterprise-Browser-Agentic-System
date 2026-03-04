import { describe, expect, test, vi, beforeEach } from "vitest";
import { BrowserPool } from "../../../src/browser/browser-pool.js";

vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({}),
        close: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

describe("BrowserPool", () => {
  let pool: BrowserPool;

  beforeEach(() => {
    pool = new BrowserPool({ maxConcurrency: 2, idleTimeoutMs: 60000 });
  });

  test("getBrowser launches chromium on first call", async () => {
    const browser = await pool.getBrowser();
    expect(browser).toBeDefined();
  });

  test("getBrowser reuses existing browser", async () => {
    const b1 = await pool.getBrowser();
    const b2 = await pool.getBrowser();
    expect(b1).toBe(b2);
  });

  test("withSlot runs function and tracks concurrency", async () => {
    const result = await pool.withSlot(async () => "done");
    expect(result).toBe("done");
  });

  test("withSlot rejects when concurrency limit reached", async () => {
    const slow = () => new Promise<string>((resolve) => setTimeout(() => resolve("ok"), 100));

    const p1 = pool.withSlot(slow);
    const p2 = pool.withSlot(slow);
    // Third call should exceed maxConcurrency=2
    await expect(pool.withSlot(slow)).rejects.toThrow("concurrency limit");
    await Promise.all([p1, p2]);
  });

  test("withSlot decrements counter even on error", async () => {
    await expect(
      pool.withSlot(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    // Should still be able to run after error
    const result = await pool.withSlot(async () => "recovered");
    expect(result).toBe("recovered");
  });

  test("close shuts down browser", async () => {
    const browser = await pool.getBrowser();
    await pool.close();
    // After close, getBrowser should launch new browser
    const b2 = await pool.getBrowser();
    expect(b2).toBeDefined();
  });

  test("close is safe when no browser is running", async () => {
    await expect(pool.close()).resolves.toBeUndefined();
  });
});
