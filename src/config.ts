import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  AZURE_AI_PROJECT_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_MODEL: z.string().default("gpt-4o"),
  CONTENT_SAFETY_ENDPOINT: z.string().optional(),
  CONTENT_SAFETY_KEY: z.string().optional(),
  CONTENT_SAFETY_BLOCK_THRESHOLD: z.coerce.number().min(1).max(7).default(4),
  COSMOS_ENDPOINT: z.string().optional(),
  COSMOS_KEY: z.string().optional(),
  COSMOS_DATABASE: z.string().default("browser-agent-db"),
  COSMOS_AUDIT_CONTAINER: z.string().default("audit-logs"),
  COSMOS_WORKFLOW_CONTAINER: z.string().default("workflow-state"),
  COSMOS_MEMORY_CONTAINER: z.string().default("conversation-memory"),
  KEY_VAULT_URL: z.string().optional(),
  ALLOWED_URL_PATTERNS: z.string().default("https://*.microsoft.com/*"),
  APPROVAL_TIMEOUT_MS: z.coerce.number().default(300000),
  MAX_BROWSER_CONCURRENCY: z.coerce.number().default(10),
  SESSION_TTL_MS: z.coerce.number().default(1800000),
  GRAPH_BASE_URL: z.string().default("https://graph.microsoft.com/v1.0"),
  TARGET_APP_SCOPE: z.string().default("api://browser-agent/.default"),
  GRAPH_DEFAULT_SCOPE: z.string().default("https://graph.microsoft.com/.default"),
  AGUI_ENABLED: z.enum(["true", "false"]).default("true"),
});

export type AppConfig = z.infer<typeof envSchema> & {
  allowlistPatterns: string[];
};

const parsed = envSchema.parse(process.env);

/**
 * Load URL allowlist patterns.
 * Priority: url-allowlist.txt file > ALLOWED_URL_PATTERNS env var
 * File format: one pattern per line, # comments, empty lines ignored.
 */
function loadAllowlistPatterns(): string[] {
  const filePath = resolve(process.cwd(), "url-allowlist.txt");
  if (existsSync(filePath)) {
    const lines = readFileSync(filePath, "utf-8").split("\n");
    const patterns = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
    if (patterns.length > 0) return patterns;
  }
  // Fallback to env var
  return parsed.ALLOWED_URL_PATTERNS.split(",").map((item) => item.trim());
}

export const config: AppConfig = {
  ...parsed,
  allowlistPatterns: loadAllowlistPatterns(),
};
