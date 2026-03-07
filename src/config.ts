import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env file into process.env (no external dependency needed)
// Skipped during test runs to avoid polluting test isolation
function loadDotEnv(): void {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    // Only set if not already defined (real env vars take precedence)
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
loadDotEnv();

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
 * Set enabled=false in the file to disable the allowlist entirely.
 */
function loadAllowlistPatterns(): string[] {
  const filePath = resolve(process.cwd(), "url-allowlist.txt");
  if (existsSync(filePath)) {
    const lines = readFileSync(filePath, "utf-8").split("\n");
    // Check for enabled=false toggle
    const enabledLine = lines.find((l) => l.trim().startsWith("enabled="));
    if (enabledLine && enabledLine.trim().toLowerCase() === "enabled=false") {
      return ["*"]; // Allow all URLs
    }
    const patterns = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith("enabled="));
    if (patterns.length > 0) return patterns;
  }
  // Fallback to env var
  return parsed.ALLOWED_URL_PATTERNS.split(",").map((item) => item.trim());
}

export const config: AppConfig = {
  ...parsed,
  allowlistPatterns: loadAllowlistPatterns(),
};
