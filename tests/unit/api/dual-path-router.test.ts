import { describe, expect, test } from "vitest";
import { DualPathRouter } from "../../../src/api/dual-path-router.js";

describe("DualPathRouter", () => {
  test("returns a valid route decision", async () => {
    const router = new DualPathRouter();
    const result = await router.decide("https://example.com");
    expect(["api", "dom"]).toContain(result.path);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  test("returns dom path when no API schema found", async () => {
    const router = new DualPathRouter();
    const result = await router.decide("https://no-api.example.com/page");
    expect(result.path).toBe("dom");
    expect(result.reason).toContain("No API");
  });

  test("getDiscovery returns SchemaDiscovery instance", () => {
    const router = new DualPathRouter();
    const discovery = router.getDiscovery();
    expect(discovery).toBeDefined();
    expect(typeof discovery.discover).toBe("function");
  });

  test("returns api path for SEC EDGAR URLs (known provider)", async () => {
    const router = new DualPathRouter();
    const result = await router.decide("https://www.sec.gov/cgi-bin/browse-edgar?CIK=AAPL");
    expect(result.path).toBe("api");
    expect(result.reason).toContain("SEC EDGAR");
  });

  test("returns api path for data.sec.gov", async () => {
    const router = new DualPathRouter();
    const result = await router.decide("https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json");
    expect(result.path).toBe("api");
    expect(result.reason).toContain("SEC EDGAR");
  });

  test("returns api path for edgar.sec.gov", async () => {
    const router = new DualPathRouter();
    const result = await router.decide("https://edgar.sec.gov/cgi-bin/browse-edgar?CIK=MSFT");
    expect(result.path).toBe("api");
  });
});
