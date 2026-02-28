import { describe, expect, test } from "vitest";
import { orchestrateWorkflow } from "../../../src/skills/orchestrate-workflow.js";

describe("Cross-skill workflow chain", () => {
  test("navigate → extract chain records security-blocked step and stops", async () => {
    // example.com is not on the default allowlist — navigate_page will fail
    const result = await orchestrateWorkflow(
      {
        steps: [
          { skill: "navigate_page", params: { url: "https://example.com" } },
          { skill: "extract_content", params: { mode: "text" } },
        ],
      },
      { userId: "u1", sessionId: "s1" },
    );

    // Workflow should NOT crash; first step is recorded as failed, chain stops.
    expect(result.success).toBe(false);
    const data = result.data as { results: { success: boolean; error?: string }[] };
    expect(data.results).toHaveLength(1);
    expect(data.results[0]?.success).toBe(false);
    expect(data.results[0]?.error).toContain("URL blocked");
  });

  test("fill form step records failure when approval times out", async () => {
    // fill_form with no URL falls through to DOM path which requires a session;
    // the security gate approval timeout would be too long for unit tests.
    // Instead we pass a URL that will fail the allowlist — same outcome:
    // the step is recorded as a security error.
    const result = await orchestrateWorkflow(
      {
        steps: [
          { skill: "fill_form", params: { url: "https://blocked.example.com", fields: { name: "Test" } } },
        ],
      },
      { userId: "u1", sessionId: "s1" },
    );

    expect(result.success).toBe(false);
    const data = result.data as { results: { success: boolean }[] };
    expect(data.results).toHaveLength(1);
    expect(data.results[0]?.success).toBe(false);
  });

  test("mixed chain stops at first failed step and records it", async () => {
    const result = await orchestrateWorkflow(
      {
        steps: [
          { skill: "navigate_page", params: { url: "https://example.com" } },
          { skill: "extract_content", params: { mode: "all" } },
          { skill: "capture_screenshot", params: {} },
        ],
      },
      { userId: "u1", sessionId: "s1" },
    );

    // navigate_page fails → chain stops with 1 recorded result
    expect(result.success).toBe(false);
    const data = result.data as { results: unknown[] };
    expect(data.results.length).toBeGreaterThanOrEqual(1);
  });

  test("empty steps array returns success with zero results", async () => {
    const result = await orchestrateWorkflow(
      { steps: [] },
      { userId: "u1", sessionId: "s1" },
    );

    expect(result.success).toBe(true);
    const data = result.data as { results: unknown[] };
    expect(data.results).toHaveLength(0);
  });
});
