import { describe, expect, test } from "vitest";
import {
  detectBotBlock,
  isSecEdgarUrl,
  extractCikFromUrl,
  extractTickerFromUrl,
} from "../../../src/api/bot-detector.js";

describe("detectBotBlock", () => {
  test("detects SEC EDGAR automated tool block", () => {
    const html =
      "Your Request Originates from an Undeclared Automated Tool. Please declare your traffic.";
    const result = detectBotBlock(html);
    expect(result.blocked).toBe(true);
    expect(result.provider).toBe("sec-edgar");
    expect(result.suggestedFallback).toBe("sec-edgar-api");
    expect(result.reason).toContain("SEC EDGAR");
  });

  test("detects SEC EDGAR equitable access block", () => {
    const html =
      "To allow for equitable access to all users, SEC.gov limits automated access to EDGAR data.";
    const result = detectBotBlock(html);
    expect(result.blocked).toBe(true);
    expect(result.provider).toBe("sec-edgar");
    expect(result.suggestedFallback).toBe("sec-edgar-api");
  });

  test("detects SEC EDGAR rate limit block", () => {
    const html = "Request rate has exceeded the limit for sec.gov. Please slow down.";
    const result = detectBotBlock(html);
    expect(result.blocked).toBe(true);
    expect(result.provider).toBe("sec-edgar");
    expect(result.suggestedFallback).toBe("sec-edgar-api");
  });

  test("detects SEC EDGAR filing access block", () => {
    const html = "Blocked automated access to filings. Please use EDGAR APIs.";
    const result = detectBotBlock(html);
    expect(result.blocked).toBe(true);
    expect(result.provider).toBe("sec-edgar");
  });

  test("detects Cloudflare challenge page", () => {
    const html =
      '<div id="challenge-platform">Checking your browser before accessing the site...</div>';
    const result = detectBotBlock(html);
    expect(result.blocked).toBe(true);
    expect(result.provider).toBe("cloudflare");
    expect(result.suggestedFallback).toBe("api-generic");
  });

  test("detects Cloudflare browser check", () => {
    const html = "Checking your browser before accessing this page...";
    const result = detectBotBlock(html);
    expect(result.blocked).toBe(true);
    expect(result.provider).toBe("cloudflare");
  });

  test("detects CAPTCHA / reCAPTCHA page", () => {
    const html = '<div class="g-recaptcha" data-sitekey="abc123"></div>';
    const result = detectBotBlock(html);
    expect(result.blocked).toBe(true);
    expect(result.provider).toBe("captcha");
    expect(result.suggestedFallback).toBe("api-generic");
  });

  test("detects hCaptcha page", () => {
    const html = '<div class="hcaptcha" data-sitekey="def456"></div>';
    const result = detectBotBlock(html);
    expect(result.blocked).toBe(true);
    expect(result.provider).toBe("captcha");
  });

  test("detects generic automated access denial", () => {
    const html = "Access denied. Automated tools are not permitted.";
    const result = detectBotBlock(html);
    expect(result.blocked).toBe(true);
    expect(result.provider).toBe("generic");
    expect(result.suggestedFallback).toBe("api-generic");
  });

  test("returns not blocked for normal HTML content", () => {
    const html =
      "<html><body><h1>Apple Inc. Annual Report</h1><p>Revenue: $394B</p></body></html>";
    const result = detectBotBlock(html);
    expect(result.blocked).toBe(false);
    expect(result.provider).toBeNull();
    expect(result.reason).toBeNull();
    expect(result.suggestedFallback).toBeNull();
  });

  test("returns not blocked for empty string", () => {
    const result = detectBotBlock("");
    expect(result.blocked).toBe(false);
  });

  test("is case-insensitive for SEC EDGAR patterns", () => {
    const html = "YOUR REQUEST ORIGINATES FROM AN UNDECLARED AUTOMATED TOOL";
    const result = detectBotBlock(html);
    expect(result.blocked).toBe(true);
    expect(result.provider).toBe("sec-edgar");
  });
});

describe("isSecEdgarUrl", () => {
  test("returns true for www.sec.gov", () => {
    expect(isSecEdgarUrl("https://www.sec.gov/cgi-bin/browse-edgar")).toBe(true);
  });

  test("returns true for sec.gov without subdomain", () => {
    expect(isSecEdgarUrl("https://sec.gov/filings")).toBe(true);
  });

  test("returns true for edgar.sec.gov", () => {
    expect(isSecEdgarUrl("https://edgar.sec.gov/cgi-bin/browse-edgar")).toBe(true);
  });

  test("returns true for data.sec.gov", () => {
    expect(isSecEdgarUrl("https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json")).toBe(
      true,
    );
  });

  test("returns true for efts.sec.gov", () => {
    expect(isSecEdgarUrl("https://efts.sec.gov/LATEST/search-index")).toBe(true);
  });

  test("returns false for non-SEC URLs", () => {
    expect(isSecEdgarUrl("https://www.google.com")).toBe(false);
  });

  test("returns false for lookalike domains", () => {
    expect(isSecEdgarUrl("https://sec.gov.evil.com/filings")).toBe(false);
  });

  test("returns false for invalid URLs", () => {
    expect(isSecEdgarUrl("not a url")).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(isSecEdgarUrl("")).toBe(false);
  });
});

describe("extractCikFromUrl", () => {
  test("extracts CIK from query parameter", () => {
    expect(
      extractCikFromUrl(
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193",
      ),
    ).toBe("320193");
  });

  test("extracts CIK from lowercase query parameter", () => {
    expect(
      extractCikFromUrl("https://www.sec.gov/cgi-bin/browse-edgar?cik=0000320193"),
    ).toBe("320193");
  });

  test("extracts ticker-as-CIK from query parameter", () => {
    expect(
      extractCikFromUrl("https://www.sec.gov/cgi-bin/browse-edgar?CIK=AAPL"),
    ).toBe("AAPL");
  });

  test("extracts CIK from path-based URL", () => {
    expect(
      extractCikFromUrl("https://www.sec.gov/edgar/data/320193/filing.htm"),
    ).toBe("320193");
  });

  test("returns null for URL without CIK", () => {
    expect(extractCikFromUrl("https://www.sec.gov/filings")).toBeNull();
  });

  test("returns null for invalid URL", () => {
    expect(extractCikFromUrl("not a url")).toBeNull();
  });

  test("handles all-zero padded CIK", () => {
    const result = extractCikFromUrl(
      "https://www.sec.gov/cgi-bin/browse-edgar?CIK=0000000000",
    );
    expect(result).toBe("0000000000");
  });
});

describe("extractTickerFromUrl", () => {
  test("extracts ticker when CIK is alphabetic", () => {
    expect(
      extractTickerFromUrl("https://www.sec.gov/cgi-bin/browse-edgar?CIK=AAPL"),
    ).toBe("AAPL");
  });

  test("returns uppercase ticker", () => {
    expect(
      extractTickerFromUrl("https://www.sec.gov/cgi-bin/browse-edgar?CIK=msft"),
    ).toBe("MSFT");
  });

  test("returns null when CIK is numeric", () => {
    expect(
      extractTickerFromUrl("https://www.sec.gov/cgi-bin/browse-edgar?CIK=0000320193"),
    ).toBeNull();
  });

  test("returns null for URL without CIK", () => {
    expect(extractTickerFromUrl("https://www.sec.gov/filings")).toBeNull();
  });
});
