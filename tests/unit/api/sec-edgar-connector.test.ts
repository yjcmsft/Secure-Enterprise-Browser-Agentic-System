import axios from "axios";
import { describe, expect, test, vi, beforeEach } from "vitest";
import {
  SecEdgarConnector,
  resolveCik,
  COMMON_FINANCIAL_CONCEPTS,
} from "../../../src/api/sec-edgar-connector.js";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    isAxiosError: (value: unknown): boolean =>
      typeof value === "object" &&
      value !== null &&
      (value as { isAxiosError?: boolean }).isAxiosError === true,
  },
}));

const getMock = vi.mocked(axios.get);

describe("resolveCik", () => {
  test("resolves known ticker to padded CIK", () => {
    expect(resolveCik("AAPL")).toBe("0000320193");
    expect(resolveCik("MSFT")).toBe("0000789019");
    expect(resolveCik("GOOGL")).toBe("0001652044");
    expect(resolveCik("AMZN")).toBe("0001018724");
  });

  test("resolves lowercase ticker", () => {
    expect(resolveCik("aapl")).toBe("0000320193");
  });

  test("pads numeric CIK to 10 digits", () => {
    expect(resolveCik("320193")).toBe("0000320193");
  });

  test("returns already-padded CIK as-is", () => {
    expect(resolveCik("0000320193")).toBe("0000320193");
  });

  test("returns null for unknown ticker", () => {
    expect(resolveCik("UNKNOWN_TICKER")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(resolveCik("")).toBeNull();
  });

  test("handles whitespace", () => {
    expect(resolveCik("  AAPL  ")).toBe("0000320193");
  });
});

describe("COMMON_FINANCIAL_CONCEPTS", () => {
  test("includes revenue concept", () => {
    expect(COMMON_FINANCIAL_CONCEPTS.revenue).toEqual({
      taxonomy: "us-gaap",
      concept: "Revenues",
    });
  });

  test("includes netIncome concept", () => {
    expect(COMMON_FINANCIAL_CONCEPTS.netIncome).toEqual({
      taxonomy: "us-gaap",
      concept: "NetIncomeLoss",
    });
  });

  test("includes totalAssets concept", () => {
    expect(COMMON_FINANCIAL_CONCEPTS.totalAssets).toEqual({
      taxonomy: "us-gaap",
      concept: "Assets",
    });
  });
});

describe("SecEdgarConnector", () => {
  let connector: SecEdgarConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new SecEdgarConnector("TestAgent/1.0 (test@example.com)");
  });

  test("getCompanyFacts calls correct URL with padded CIK", async () => {
    getMock.mockResolvedValueOnce({
      data: { cik: "0000320193", entityName: "Apple Inc", facts: {} },
    });

    const result = await connector.getCompanyFacts("320193");
    expect(result.entityName).toBe("Apple Inc");
    expect(getMock).toHaveBeenCalledWith(
      "https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json",
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": "TestAgent/1.0 (test@example.com)",
        }),
      }),
    );
  });

  test("getCompanyConcept calls correct URL with taxonomy and concept", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        cik: 320193,
        taxonomy: "us-gaap",
        tag: "Revenues",
        label: "Revenues",
        description: "Total revenue",
        entityName: "Apple Inc",
        units: { USD: [] },
      },
    });

    const result = await connector.getCompanyConcept("320193", "us-gaap", "Revenues");
    expect(result.tag).toBe("Revenues");
    expect(getMock).toHaveBeenCalledWith(
      "https://data.sec.gov/api/xbrl/companyconcept/CIK0000320193/us-gaap/Revenues.json",
      expect.any(Object),
    );
  });

  test("getSubmissions calls correct URL", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        cik: "0000320193",
        entityType: "operating",
        name: "Apple Inc",
        tickers: ["AAPL"],
        exchanges: ["Nasdaq"],
        filings: { recent: { form: [], filingDate: [], primaryDocument: [], accessionNumber: [] } },
      },
    });

    const result = await connector.getSubmissions("320193");
    expect(result.name).toBe("Apple Inc");
  });

  test("searchFilings calls full-text search endpoint", async () => {
    getMock.mockResolvedValueOnce({
      data: { query: "apple revenue", hits: [], total: 0 },
    });

    const result = await connector.searchFilings("apple revenue", 5);
    expect(result.query).toBe("apple revenue");
    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining("efts.sec.gov/LATEST/search-index"),
      expect.any(Object),
    );
  });

  test("extractFinancialSummary returns structured data for known ticker", async () => {
    // Mock getCompanyFacts
    getMock.mockResolvedValueOnce({
      data: {
        cik: "0000320193",
        entityName: "Apple Inc",
        facts: {
          "us-gaap": {
            Revenues: {
              label: "Revenues",
              description: "Total revenue",
              units: {
                USD: [
                  { end: "2025-09-30", val: 394328000000, accn: "0000320193-25-000001", fy: 2025, fp: "FY", form: "10-K", filed: "2025-10-31" },
                  { end: "2024-09-30", val: 383285000000, accn: "0000320193-24-000001", fy: 2024, fp: "FY", form: "10-K", filed: "2024-10-31" },
                ],
              },
            },
            NetIncomeLoss: {
              label: "Net Income (Loss)",
              description: "Net income",
              units: {
                USD: [
                  { end: "2025-09-30", val: 96995000000, accn: "0000320193-25-000001", fy: 2025, fp: "FY", form: "10-K", filed: "2025-10-31" },
                ],
              },
            },
          },
        },
      },
    });

    // Mock getSubmissions
    getMock.mockResolvedValueOnce({
      data: {
        cik: "0000320193",
        name: "Apple Inc",
        tickers: ["AAPL"],
        exchanges: ["Nasdaq"],
        filings: {
          recent: {
            form: ["10-K", "10-Q", "8-K"],
            filingDate: ["2025-10-31", "2025-07-31", "2025-06-15"],
            primaryDocument: ["aapl-20250930.htm", "aapl-20250630.htm", "form8k.htm"],
            accessionNumber: ["0000320193-25-000001", "0000320193-25-000002", "0000320193-25-000003"],
          },
        },
      },
    });

    const result = await connector.extractFinancialSummary("AAPL");
    expect(result.source).toBe("sec-edgar-xbrl");
    expect(result.entityName).toBe("Apple Inc");
    expect(result.cik).toBe("0000320193");
    expect(result.dataPoints.length).toBeGreaterThanOrEqual(2);
    expect(result.recentFilings.length).toBe(3);

    const revenue = result.dataPoints.find((dp) => dp.concept === "revenue");
    expect(revenue).toBeDefined();
    expect(revenue!.value).toBe(394328000000);
    expect(revenue!.fiscalYear).toBe(2025);
    expect(revenue!.form).toBe("10-K");
  });

  test("extractFinancialSummary throws for unknown ticker", async () => {
    await expect(connector.extractFinancialSummary("NONEXIST")).rejects.toThrow(
      'Cannot resolve ticker/CIK: "NONEXIST"',
    );
  });

  test("retries on transient 503 error", async () => {
    getMock
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 503 },
        message: "Service Unavailable",
      })
      .mockResolvedValueOnce({
        data: { cik: "0000320193", entityName: "Apple Inc", facts: {} },
      });

    const result = await connector.getCompanyFacts("320193");
    expect(result.entityName).toBe("Apple Inc");
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  test("retries on 429 rate limit error", async () => {
    getMock
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 429 },
        message: "Too Many Requests",
      })
      .mockResolvedValueOnce({
        data: { cik: "0000320193", entityName: "Apple Inc", facts: {} },
      });

    const result = await connector.getCompanyFacts("320193");
    expect(result.entityName).toBe("Apple Inc");
  });

  test("does not retry on 404 error", async () => {
    getMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
      message: "Not Found",
    });

    await expect(connector.getCompanyFacts("999999999")).rejects.toBeDefined();
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  test("retries on network timeout", async () => {
    getMock
      .mockRejectedValueOnce({
        isAxiosError: true,
        code: "ETIMEDOUT",
        message: "Timeout",
      })
      .mockResolvedValueOnce({
        data: { cik: "0000320193", entityName: "Apple Inc", facts: {} },
      });

    const result = await connector.getCompanyFacts("320193");
    expect(result.entityName).toBe("Apple Inc");
  });

  test("sends correct User-Agent header", async () => {
    getMock.mockResolvedValueOnce({
      data: { cik: "0000320193", entityName: "Apple Inc", facts: {} },
    });

    await connector.getCompanyFacts("320193");
    expect(getMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": "TestAgent/1.0 (test@example.com)",
          Accept: "application/json",
        }),
      }),
    );
  });

  test("extractFinancialSummary handles empty facts gracefully", async () => {
    getMock.mockResolvedValueOnce({
      data: { cik: "0000320193", entityName: "Apple Inc", facts: {} },
    });
    getMock.mockResolvedValueOnce({
      data: {
        cik: "0000320193",
        name: "Apple Inc",
        filings: { recent: { form: [], filingDate: [], primaryDocument: [], accessionNumber: [] } },
      },
    });

    const result = await connector.extractFinancialSummary("AAPL");
    expect(result.dataPoints).toHaveLength(0);
    expect(result.recentFilings).toHaveLength(0);
    expect(result.rawFactCount).toBe(0);
  });

  test("uses default User-Agent when none provided", () => {
    const defaultConnector = new SecEdgarConnector();
    // Just verify it instantiates without error
    expect(defaultConnector).toBeDefined();
  });
});
