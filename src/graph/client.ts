import { DefaultAzureCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import type { SkillExecutionContext } from "../types/skills.js";
import { config } from "../config.js";

interface GraphClientOptions {
  requiredPermissions?: string[];
}

function createClient(token: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
}

async function resolveToken(context: SkillExecutionContext): Promise<string> {
  if (context.graphAccessToken) {
    return context.graphAccessToken;
  }

  const credential = new DefaultAzureCredential();
  const token = await credential.getToken(config.GRAPH_DEFAULT_SCOPE);
  if (!token?.token) {
    throw new Error("Unable to acquire Microsoft Graph token");
  }
  return token.token;
}

export async function withGraphClient<T>(
  context: SkillExecutionContext,
  operation: (client: Client) => Promise<T>,
  options?: GraphClientOptions,
): Promise<T> {
  const token = await resolveToken(context);
  validateGraphPermissions(token, options?.requiredPermissions ?? []);
  const client = createClient(token);

  let attempt = 0;
  const maxAttempts = 3;
  while (attempt < maxAttempts) {
    try {
      return await operation(client);
    } catch (error) {
      attempt += 1;
      if (attempt >= maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }

  throw new Error("Graph operation failed unexpectedly");
}

function validateGraphPermissions(token: string, requiredPermissions: string[]): void {
  if (requiredPermissions.length === 0) {
    return;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    throw new Error("Unable to decode Graph access token claims");
  }

  const scp = typeof payload.scp === "string" ? payload.scp.split(" ") : [];
  const roles = Array.isArray(payload.roles)
    ? payload.roles.filter((item): item is string => typeof item === "string")
    : [];

  const granted = new Set<string>([...scp, ...roles]);
  const missing = requiredPermissions.filter((permission) => !granted.has(permission));
  if (missing.length > 0) {
    throw new Error(`Missing required Microsoft Graph permissions: ${missing.join(", ")}`);
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  const base64Payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, "=");

  try {
    const payload = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}
