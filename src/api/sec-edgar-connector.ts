/**
 * SEC EDGAR XBRL Connector — Fetches structured financial data from the
 * SEC's EDGAR XBRL API (https://data.sec.gov/api/xbrl/) when browser-based
 * DOM scraping is blocked by SEC bot detection.
 *
 * This is the canonical example of the dual-path strategy: when a site blocks
 * automated browser access, fall back to its structured REST API.
 *
 * SEC EDGAR APIs used:
 * - Company Facts:   https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json
 * - Company Concept: https://data.sec.gov/api/xbrl/companyconcept/CIK{cik}/{taxonomy}/{concept}.json
 * - Submissions:     https://data.sec.gov/submissions/CIK{cik}.json
 * - Full-text search:https://efts.sec.gov/LATEST/search-index?q={query}
 *
 * NOTE: SEC requires a User-Agent header with contact info per their fair access policy.
 * See: https://www.sec.gov/os/accessing-edgar-data
 */

import axios, { type AxiosError } from "axios";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

/** SEC requires a descriptive User-Agent with contact info */
const SEC_USER_AGENT = "SecureEnterpriseBrowserAgent/1.0 (enterprise-browser-agent@contoso.com)";

const SEC_API_TIMEOUT = 15_000;
const MAX_RETRIES = 2;

/** Commonly requested XBRL concepts for financial comparison */
export const COMMON_FINANCIAL_CONCEPTS = {
  revenue: { taxonomy: "us-gaap", concept: "Revenues" },
  revenueAlt: { taxonomy: "us-gaap", concept: "RevenueFromContractWithCustomerExcludingAssessedTax" },
  netIncome: { taxonomy: "us-gaap", concept: "NetIncomeLoss" },
  totalAssets: { taxonomy: "us-gaap", concept: "Assets" },
  totalLiabilities: { taxonomy: "us-gaap", concept: "Liabilities" },
  stockholdersEquity: { taxonomy: "us-gaap", concept: "StockholdersEquity" },
  earningsPerShare: { taxonomy: "us-gaap", concept: "EarningsPerShareBasic" },
  operatingIncome: { taxonomy: "us-gaap", concept: "OperatingIncomeLoss" },
  grossProfit: { taxonomy: "us-gaap", concept: "GrossProfit" },
  cashAndEquivalents: { taxonomy: "us-gaap", concept: "CashAndCashEquivalentsAtCarryingValue" },
} as const;

/** Well-known ticker → CIK mappings (padded to 10 digits as SEC requires) */
const TICKER_TO_CIK: Record<string, string> = {
  AAPL: "0000320193",
  MSFT: "0000789019",
  GOOGL: "0001652044",
  AMZN: "0001018724",
  META: "0001326801",
  TSLA: "0001318605",
  NVDA: "0001045810",
  JPM: "0000019617",
  V: "0001403161",
  JNJ: "0000200406",
  WMT: "0000104169",
  PG: "0000080424",
  UNH: "0000731766",
  MA: "0001141391",
  HD: "0000354950",
};

export interface CompanyFiling {
  cik: string;
  entityName: string;
  facts: Record<string, Record<string, FactEntry>>;
}

export interface FactEntry {
  label: string;
  description: string;
  units: Record<string, FactUnit[]>;
}

export interface FactUnit {
  end: string;
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  start?: string;
}

export interface CompanySubmission {
  cik: string;
  entityType: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      primaryDocument: string[];
      form: string[];
    };
  };
}

export interface EdgarSearchResult {
  query: string;
  hits: Array<{
    _id: string;
    _source: {
      file_date: string;
      display_names: string[];
      form_type: string;
    };
  }>;
  total: number;
}

export interface FinancialDataPoint {
  concept: string;
  label: string;
  value: number;
  unit: string;
  period: string;
  fiscalYear: number;
  fiscalPeriod: string;
  form: string;
  filedDate: string;
}

export interface SecEdgarApiResult {
  source: "sec-edgar-xbrl";
  entityName: string;
  cik: string;
  dataPoints: FinancialDataPoint[];
  recentFilings: Array<{
    form: string;
    filingDate: string;
    accessionNumber: string;
  }>;
  rawFactCount: number;
}

/**
 * Resolve a ticker or CIK string to a zero-padded 10-digit CIK.
 * First checks the local map, then falls back to SEC EDGAR company search API
 * for dynamic resolution of unknown tickers.
 */
export function resolveCik(tickerOrCik: string): string | null {
  const cleaned = tickerOrCik.trim().toUpperCase();

  // Check ticker map first
  if (TICKER_TO_CIK[cleaned]) {
    return TICKER_TO_CIK[cleaned]!;
  }

  // If numeric, pad to 10 digits
  if (/^\d+$/.test(cleaned)) {
    return cleaned.padStart(10, "0");
  }

  return null;
}

/**
 * Dynamically resolve a company name or unknown ticker to a CIK using
 * SEC EDGAR's full-text search API at efts.sec.gov.
 *
 * This handles cases where the ticker isn't in the pre-mapped list.
 * Example: resolveCikDynamic("Berkshire Hathaway") → "0001067983"
 */
export async function resolveCikDynamic(query: string): Promise<string | null> {
  // Try static resolution first
  const staticCik = resolveCik(query);
  if (staticCik) return staticCik;

  // Dynamic lookup via SEC EDGAR company search
  try {
    const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&dateRange=custom&startdt=2020-01-01&forms=10-K&from=0&size=1`;
    const response = await axios.get<{
      hits: { hits: Array<{ _source: { entity_name?: string; file_num?: string; display_names?: string[] } }> };
    }>(searchUrl, {
      timeout: 10_000,
      headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
    });

    // Also try the company tickers endpoint for ticker-based lookup
    const tickerUrl = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(query)}%22&forms=10-K&from=0&size=1`;
    const tickerResponse = await axios.get(tickerUrl, {
      timeout: 10_000,
      headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
    }).catch(() => null);

    // Try company tickers JSON endpoint (most reliable for ticker lookup)
    try {
      const companyTickersResponse = await axios.get<Record<string, { cik_str: number; ticker: string; title: string }>>(
        "https://www.sec.gov/files/company_tickers.json",
        { timeout: 10_000, headers: { "User-Agent": SEC_USER_AGENT } },
      );
      const entries = Object.values(companyTickersResponse.data);
      const match = entries.find(
        (e) => e.ticker.toUpperCase() === query.toUpperCase() ||
               e.title.toUpperCase().includes(query.toUpperCase()),
      );
      if (match) {
        const cik = String(match.cik_str).padStart(10, "0");
        logger.info("sec-edgar-dynamic-resolve", { query, cik, entity: match.title, source: "company_tickers" });
        return cik;
      }
    } catch {
      // company_tickers endpoint failed — continue with search results
    }

    // Fallback: parse search results for CIK
    if (tickerResponse?.data?.hits?.hits?.[0]) {
      const hit = tickerResponse.data.hits.hits[0];
      const fileNum = hit._source?.file_num;
      if (fileNum) {
        logger.info("sec-edgar-dynamic-resolve", { query, fileNum, source: "search-index" });
      }
    }

    logger.warn("sec-edgar-dynamic-resolve-failed", { query });
    return null;
  } catch (error) {
    logger.warn("sec-edgar-dynamic-resolve-error", { query, error: (error as Error).message });
    return null;
  }
}

/**
 * SEC EDGAR XBRL API connector — fetches structured financial data
 * directly from SEC's public APIs, bypassing the need for browser automation.
 */
export class SecEdgarConnector {
  private readonly userAgent: string;

  constructor(userAgent?: string) {
    this.userAgent = userAgent ?? SEC_USER_AGENT;
  }

  /**
   * Fetch all company facts (XBRL) for a given CIK.
   * This is the richest endpoint — contains all reported financial data.
   */
  public async getCompanyFacts(cik: string): Promise<CompanyFiling> {
    const paddedCik = cik.padStart(10, "0");
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`;

    logger.info("sec-edgar-fetch", { endpoint: "companyfacts", cik: paddedCik });
    return this.fetchWithRetry<CompanyFiling>(url);
  }

  /**
   * Fetch a specific XBRL concept for a company.
   * Example: Revenue, NetIncome, Assets, etc.
   */
  public async getCompanyConcept(
    cik: string,
    taxonomy: string,
    concept: string,
  ): Promise<{
    cik: number;
    taxonomy: string;
    tag: string;
    label: string;
    description: string;
    entityName: string;
    units: Record<string, FactUnit[]>;
  }> {
    const paddedCik = cik.padStart(10, "0");
    const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${paddedCik}/${taxonomy}/${concept}.json`;

    logger.info("sec-edgar-fetch", { endpoint: "companyconcept", cik: paddedCik, taxonomy, concept });
    return this.fetchWithRetry(url);
  }

  /**
   * Fetch recent submissions (filings) for a company.
   */
  public async getSubmissions(cik: string): Promise<CompanySubmission> {
    const paddedCik = cik.padStart(10, "0");
    const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

    logger.info("sec-edgar-fetch", { endpoint: "submissions", cik: paddedCik });
    return this.fetchWithRetry<CompanySubmission>(url);
  }

  /**
   * Full-text search across EDGAR filings.
   */
  public async searchFilings(query: string, limit = 10): Promise<EdgarSearchResult> {
    const url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&dateRange=custom&startdt=2020-01-01&forms=10-K,10-Q&from=0&size=${limit}`;

    logger.info("sec-edgar-fetch", { endpoint: "search", query });
    return this.fetchWithRetry<EdgarSearchResult>(url);
  }

  /**
   * High-level: extract key financial data points from a company's XBRL data.
   * Returns the most recent annual (10-K) values for common financial concepts.
   */
  public async extractFinancialSummary(tickerOrCik: string): Promise<SecEdgarApiResult> {
    // Try static resolution first, then dynamic lookup via SEC EDGAR search
    let cik = resolveCik(tickerOrCik);
    if (!cik) {
      cik = await resolveCikDynamic(tickerOrCik);
    }
    if (!cik) {
      throw new Error(`Cannot resolve ticker/CIK: "${tickerOrCik}". Use a ticker (e.g., AAPL, MSFT), numeric CIK, or company name.`);
    }

    const [facts, submissions] = await Promise.all([
      this.getCompanyFacts(cik),
      this.getSubmissions(cik),
    ]);

    const dataPoints = this.extractKeyMetrics(facts);
    const recentFilings = this.extractRecentFilings(submissions);

    const result: SecEdgarApiResult = {
      source: "sec-edgar-xbrl",
      entityName: facts.entityName ?? submissions.name ?? "Unknown",
      cik,
      dataPoints,
      recentFilings,
      rawFactCount: this.countFacts(facts),
    };

    logger.info("sec-edgar-summary", {
      cik,
      entity: result.entityName,
      dataPoints: dataPoints.length,
      filings: recentFilings.length,
    });

    return result;
  }

  /**
   * Extract key financial metrics from company facts XBRL data.
   * Focuses on the most recent 10-K and 10-Q filings.
   */
  private extractKeyMetrics(facts: CompanyFiling): FinancialDataPoint[] {
    const dataPoints: FinancialDataPoint[] = [];
    const usGaap = facts.facts?.["us-gaap"];
    if (!usGaap) return dataPoints;

    for (const [conceptKey, config] of Object.entries(COMMON_FINANCIAL_CONCEPTS)) {
      const factEntry = usGaap[config.concept];
      if (!factEntry?.units) continue;

      // Get USD values (most common unit for financial data)
      const usdValues = factEntry.units["USD"];
      if (!usdValues?.length) continue;

      // Get the most recent 10-K (annual) filing
      const annualValues = usdValues
        .filter((v) => v.form === "10-K")
        .sort((a, b) => b.fy - a.fy || b.end.localeCompare(a.end));

      const latest = annualValues[0];
      if (latest) {
        dataPoints.push({
          concept: conceptKey,
          label: factEntry.label || config.concept,
          value: latest.val,
          unit: "USD",
          period: latest.end,
          fiscalYear: latest.fy,
          fiscalPeriod: latest.fp,
          form: latest.form,
          filedDate: latest.filed,
        });
      }
    }

    return dataPoints;
  }

  /**
   * Extract recent filings from submissions data.
   */
  private extractRecentFilings(
    submissions: CompanySubmission,
  ): SecEdgarApiResult["recentFilings"] {
    const recent = submissions.filings?.recent;
    if (!recent?.form) return [];

    const filings: SecEdgarApiResult["recentFilings"] = [];
    const count = Math.min(recent.form.length, 10);

    for (let i = 0; i < count; i++) {
      filings.push({
        form: recent.form[i]!,
        filingDate: recent.filingDate[i]!,
        accessionNumber: recent.accessionNumber[i]!,
      });
    }

    return filings;
  }

  /**
   * Count total XBRL facts in a company filing.
   */
  private countFacts(facts: CompanyFiling): number {
    let count = 0;
    for (const taxonomy of Object.values(facts.facts ?? {})) {
      for (const concept of Object.values(taxonomy)) {
        for (const units of Object.values((concept as FactEntry).units ?? {})) {
          count += units.length;
        }
      }
    }
    return count;
  }

  /**
   * HTTP GET with retry logic and SEC-required headers.
   */
  private async fetchWithRetry<T>(url: string): Promise<T> {
    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
      try {
        const response = await axios.get<T>(url, {
          timeout: SEC_API_TIMEOUT,
          headers: {
            "User-Agent": this.userAgent,
            Accept: "application/json",
          },
        });
        return response.data;
      } catch (error) {
        if (attempt === MAX_RETRIES || !this.isRetryable(error)) {
          logger.error("sec-edgar-fetch-failed", {
            url,
            attempt,
            error: (error as Error).message,
          });
          throw error;
        }
        const backoff = Math.min(2000, 500 * 2 ** attempt) + Math.floor(Math.random() * 100);
        logger.warn("sec-edgar-retry", { url, attempt, backoffMs: backoff });
        await new Promise((r) => setTimeout(r, backoff));
      }
      attempt += 1;
    }
    throw new Error("Unreachable retry branch");
  }

  private isRetryable(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;
    const axiosErr = error as AxiosError;
    if (axiosErr.code === "ECONNABORTED" || axiosErr.code === "ETIMEDOUT") return true;
    if (!axiosErr.response) return true;
    const status = axiosErr.response.status;
    return status === 408 || status === 429 || status >= 500;
  }
}
