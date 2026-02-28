import { describe, expect, test } from "vitest";
import { UrlAllowlist } from "../../../src/security/url-allowlist.js";

describe("UrlAllowlist", () => {
  test("allows matching wildcard domain", () => {
    const allowlist = new UrlAllowlist(["https://*.microsoft.com/*"]);
    expect(allowlist.isAllowed("https://learn.microsoft.com/en-us")).toBe(true);
  });

  test("blocks non-matching domain", () => {
    const allowlist = new UrlAllowlist(["https://*.microsoft.com/*"]);
    expect(allowlist.isAllowed("https://example.com")).toBe(false);
  });

  test("blocks deceptive lookalike host", () => {
    const allowlist = new UrlAllowlist(["https://*.microsoft.com/*"]);
    expect(allowlist.isAllowed("https://learn.microsoft.com.evil.com/en-us")).toBe(false);
  });

  test("blocks invalid url values", () => {
    const allowlist = new UrlAllowlist(["https://*.microsoft.com/*"]);
    expect(allowlist.isAllowed("not-a-url")).toBe(false);
  });
});
