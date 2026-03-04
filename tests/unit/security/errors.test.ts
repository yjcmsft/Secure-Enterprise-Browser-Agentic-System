import { describe, expect, test } from "vitest";
import { SecurityError, isSecurityError } from "../../../src/security/errors.js";

describe("SecurityError", () => {
  test("creates error with code, message, and httpStatus", () => {
    const err = new SecurityError("URL_NOT_ALLOWED", "blocked", 403);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SecurityError");
    expect(err.code).toBe("URL_NOT_ALLOWED");
    expect(err.message).toBe("blocked");
    expect(err.httpStatus).toBe(403);
    expect(err.details).toBeUndefined();
  });

  test("creates error with details", () => {
    const err = new SecurityError("INPUT_BLOCKED", "unsafe", 403, { reason: "pii" });
    expect(err.details).toEqual({ reason: "pii" });
  });

  test("defaults httpStatus to 403", () => {
    const err = new SecurityError("APPROVAL_DENIED", "denied");
    expect(err.httpStatus).toBe(403);
  });
});

describe("isSecurityError", () => {
  test("returns true for SecurityError instances", () => {
    const err = new SecurityError("URL_NOT_ALLOWED", "blocked");
    expect(isSecurityError(err)).toBe(true);
  });

  test("returns false for regular errors", () => {
    expect(isSecurityError(new Error("nope"))).toBe(false);
  });

  test("returns false for non-error values", () => {
    expect(isSecurityError(null)).toBe(false);
    expect(isSecurityError("string")).toBe(false);
    expect(isSecurityError(42)).toBe(false);
  });
});
