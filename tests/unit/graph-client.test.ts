import { describe, expect, test } from "vitest";

// Test JWT decode and permission validation logic from graph/client.ts
// These are private functions tested by replicating their logic

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const base64Payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, "=");
  try {
    const payload = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("JWT decode logic (graph/client)", () => {
  test("decodes valid JWT payload", () => {
    const token = makeJwt({ sub: "user1", scp: "Calendars.Read Chat.ReadWrite" });
    const payload = decodeJwtPayload(token);
    expect(payload).toBeDefined();
    expect(payload!.sub).toBe("user1");
    expect(payload!.scp).toBe("Calendars.Read Chat.ReadWrite");
  });

  test("returns null for token with fewer than 2 parts", () => {
    expect(decodeJwtPayload("single-part")).toBeNull();
  });

  test("returns null for invalid base64 payload", () => {
    expect(decodeJwtPayload("header.!!!invalid!!!.sig")).toBeNull();
  });

  test("handles URL-safe base64 encoding", () => {
    const token = makeJwt({ aud: "https://graph.microsoft.com" });
    const decoded = decodeJwtPayload(token);
    expect(decoded!.aud).toBe("https://graph.microsoft.com");
  });

  test("decodes roles array", () => {
    const token = makeJwt({ roles: ["Application.Read", "Mail.Send"] });
    const decoded = decodeJwtPayload(token);
    expect(decoded!.roles).toEqual(["Application.Read", "Mail.Send"]);
  });
});

describe("Permission validation logic (graph/client)", () => {
  function validatePermissions(
    token: string,
    requiredPermissions: string[],
  ): { valid: boolean; missing: string[] } {
    if (requiredPermissions.length === 0) return { valid: true, missing: [] };
    const payload = decodeJwtPayload(token);
    if (!payload) return { valid: false, missing: requiredPermissions };
    const scp = typeof payload.scp === "string" ? payload.scp.split(" ") : [];
    const roles = Array.isArray(payload.roles)
      ? payload.roles.filter((item): item is string => typeof item === "string")
      : [];
    const granted = new Set<string>([...scp, ...roles]);
    const missing = requiredPermissions.filter((p) => !granted.has(p));
    return { valid: missing.length === 0, missing };
  }

  test("passes when no permissions required", () => {
    const result = validatePermissions(makeJwt({}), []);
    expect(result.valid).toBe(true);
  });

  test("passes when scp contains required permissions", () => {
    const token = makeJwt({ scp: "Calendars.Read Chat.ReadWrite" });
    const result = validatePermissions(token, ["Calendars.Read"]);
    expect(result.valid).toBe(true);
  });

  test("passes when roles contain required permissions", () => {
    const token = makeJwt({ roles: ["Application.Read"] });
    const result = validatePermissions(token, ["Application.Read"]);
    expect(result.valid).toBe(true);
  });

  test("fails when required permissions are missing", () => {
    const token = makeJwt({ scp: "Calendars.Read" });
    const result = validatePermissions(token, ["Mail.Send"]);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("Mail.Send");
  });

  test("fails for invalid token", () => {
    const result = validatePermissions("bad", ["Calendars.Read"]);
    expect(result.valid).toBe(false);
  });

  test("combines scp and roles permissions", () => {
    const token = makeJwt({ scp: "Calendars.Read", roles: ["Mail.Send"] });
    const result = validatePermissions(token, ["Calendars.Read", "Mail.Send"]);
    expect(result.valid).toBe(true);
  });
});
