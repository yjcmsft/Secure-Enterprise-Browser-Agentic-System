import { describe, expect, test } from "vitest";
import { DualPathRouter } from "../../../src/api/dual-path-router.js";

describe("DualPathRouter", () => {
  test("returns a valid route decision", async () => {
    const router = new DualPathRouter();
    const result = await router.decide("https://example.com");
    expect(["api", "dom"]).toContain(result.path);
    expect(result.reason.length).toBeGreaterThan(0);
  });
});
