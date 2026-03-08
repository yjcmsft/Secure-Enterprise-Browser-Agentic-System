import { describe, expect, test, beforeAll, afterAll } from "vitest";

/**
 * Real E2E smoke test — starts the Express server and hits actual endpoints.
 * Verifies the deployed application works end-to-end.
 */

const BASE = "http://localhost:3099"; // Use non-default port to avoid conflicts

async function startServer(): Promise<void> {
  // Override port before importing
  process.env.PORT = "3099";
  process.env.NODE_ENV = "test";
  await import("../../src/index.js");
  // The server starts automatically on import — give it a moment
  await new Promise((r) => setTimeout(r, 1000));
}

async function fetchJson(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, options);
  return { status: res.status, data: await res.json() as Record<string, unknown> };
}

describe("E2E server smoke test", () => {
  beforeAll(async () => {
    await startServer();
  }, 15000);

  afterAll(async () => {
    // Server cleanup happens via process exit
  });

  test("/health returns healthy", async () => {
    const { status, data } = await fetchJson("/health");
    expect(status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.requestId).toBeDefined();
  });

  test("/ready returns 200 (ready or ready_degraded)", async () => {
    const { status, data } = await fetchJson("/ready");
    expect(status).toBe(200);
    expect(["ready", "ready_degraded"]).toContain(data.status);
  });

  test("/api/features returns feature flags", async () => {
    const { status, data } = await fetchJson("/api/features");
    expect(status).toBe(200);
    expect(data).toHaveProperty("urlAllowlist");
    expect(data).toHaveProperty("contentSafety");
    expect(data).toHaveProperty("aguiStreaming");
  });

  test("/api/workiq/benchmarks returns industry data", async () => {
    const { status, data } = await fetchJson("/api/workiq/benchmarks");
    expect(status).toBe(200);
    expect(data).toHaveProperty("benchmarks");
    const benchmarks = data.benchmarks as Record<string, unknown>;
    expect(benchmarks).toHaveProperty("financial_services");
    expect(benchmarks).toHaveProperty("technology");
  });

  test("/api/workiq/skill-estimates returns all 12 skills", async () => {
    const { status, data } = await fetchJson("/api/workiq/skill-estimates");
    expect(status).toBe(200);
    const estimates = data.estimates as Record<string, unknown>;
    expect(Object.keys(estimates).length).toBe(12);
    expect(estimates).toHaveProperty("navigate_page");
    expect(estimates).toHaveProperty("compare_data");
  });

  test("POST /api/skills/navigate_page with blocked URL returns security error", async () => {
    const { status, data } = await fetchJson("/api/skills/navigate_page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "test",
        sessionId: "e2e-smoke",
        params: { url: "https://evil-site.com/hack" },
      }),
    });
    // Should fail with security error (URL not in allowlist)
    expect(status).toBeGreaterThanOrEqual(400);
    expect(data.error || data.success === false).toBeTruthy();
  });

  test("x-request-id correlation works", async () => {
    const res = await fetch(`${BASE}/health`, {
      headers: { "x-request-id": "e2e-smoke-test-123" },
    });
    const data = await res.json() as Record<string, unknown>;
    expect(data.requestId).toBe("e2e-smoke-test-123");
  });
});
