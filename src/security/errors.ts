import type { SecurityErrorCode } from "../types/security.js";

export class SecurityError extends Error {
  public readonly code: SecurityErrorCode;
  public readonly httpStatus: number;
  public readonly details?: Record<string, unknown>;

  public constructor(
    code: SecurityErrorCode,
    message: string,
    httpStatus = 403,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SecurityError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export function isSecurityError(error: unknown): error is SecurityError {
  return error instanceof SecurityError;
}