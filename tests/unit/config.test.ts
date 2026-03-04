import { describe, expect, test } from "vitest";
import { config } from "../../src/config.js";

describe("config", () => {
  test("has default PORT", () => {
    expect(config.PORT).toBe(3000);
  });

  test("has default AZURE_OPENAI_MODEL", () => {
    expect(config.AZURE_OPENAI_MODEL).toBe("gpt-4o");
  });

  test("has default CONTENT_SAFETY_BLOCK_THRESHOLD", () => {
    expect(config.CONTENT_SAFETY_BLOCK_THRESHOLD).toBe(4);
  });

  test("has default COSMOS_DATABASE", () => {
    expect(config.COSMOS_DATABASE).toBe("browser-agent-db");
  });

  test("has default COSMOS_AUDIT_CONTAINER", () => {
    expect(config.COSMOS_AUDIT_CONTAINER).toBe("audit-logs");
  });

  test("has default COSMOS_WORKFLOW_CONTAINER", () => {
    expect(config.COSMOS_WORKFLOW_CONTAINER).toBe("workflow-state");
  });

  test("has default COSMOS_MEMORY_CONTAINER", () => {
    expect(config.COSMOS_MEMORY_CONTAINER).toBe("conversation-memory");
  });

  test("has default APPROVAL_TIMEOUT_MS", () => {
    expect(config.APPROVAL_TIMEOUT_MS).toBe(300000);
  });

  test("has default MAX_BROWSER_CONCURRENCY", () => {
    expect(config.MAX_BROWSER_CONCURRENCY).toBe(10);
  });

  test("has default SESSION_TTL_MS", () => {
    expect(config.SESSION_TTL_MS).toBe(1800000);
  });

  test("has default GRAPH_BASE_URL", () => {
    expect(config.GRAPH_BASE_URL).toBe("https://graph.microsoft.com/v1.0");
  });

  test("has default TARGET_APP_SCOPE", () => {
    expect(config.TARGET_APP_SCOPE).toBe("api://browser-agent/.default");
  });

  test("has default GRAPH_DEFAULT_SCOPE", () => {
    expect(config.GRAPH_DEFAULT_SCOPE).toBe("https://graph.microsoft.com/.default");
  });

  test("has default AGUI_ENABLED", () => {
    expect(config.AGUI_ENABLED).toBe("true");
  });

  test("parses ALLOWED_URL_PATTERNS into allowlistPatterns array", () => {
    expect(Array.isArray(config.allowlistPatterns)).toBe(true);
    expect(config.allowlistPatterns.length).toBeGreaterThan(0);
  });

  test("NODE_ENV defaults to development or test", () => {
    expect(["development", "test", "production"]).toContain(config.NODE_ENV);
  });
});
