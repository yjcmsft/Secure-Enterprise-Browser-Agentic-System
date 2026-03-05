import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../../src/config.js", () => ({
  config: {
    AZURE_OPENAI_ENDPOINT: "",
    AZURE_OPENAI_MODEL: "gpt-4o",
    allowlistPatterns: ["*"],
    MAX_BROWSER_CONCURRENCY: 3,
    SESSION_TTL_MS: 600000,
    TARGET_APP_SCOPE: "",
    GRAPH_DEFAULT_SCOPE: "",
    CONTENT_SAFETY_ENDPOINT: "",
    CONTENT_SAFETY_BLOCK_THRESHOLD: 4,
  },
}));

import { TaskPlanner } from "../../../src/orchestrator/task-planner.js";

describe("TaskPlanner keyword planning", () => {
  let planner: TaskPlanner;

  beforeEach(() => {
    planner = new TaskPlanner();
  });

  test("createPlan falls back to keywords when no LLM endpoint", async () => {
    const plan = await planner.createPlan("Navigate to https://example.com");
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps[0]!.skill).toBe("navigate_page");
  });

  test("detects navigate keyword", () => {
    const plan = planner.createPlanFromKeywords("Navigate to the dashboard");
    expect(plan.steps.some((s) => s.skill === "navigate_page")).toBe(true);
  });

  test("detects open keyword", () => {
    const plan = planner.createPlanFromKeywords("Open the Jira board");
    expect(plan.steps.some((s) => s.skill === "navigate_page")).toBe(true);
  });

  test("detects extract keyword", () => {
    const plan = planner.createPlanFromKeywords("Extract the table data");
    expect(plan.steps.some((s) => s.skill === "extract_content")).toBe(true);
  });

  test("detects table keyword", () => {
    const plan = planner.createPlanFromKeywords("Show me the table");
    expect(plan.steps.some((s) => s.skill === "extract_content")).toBe(true);
  });

  test("detects summary keyword", () => {
    const plan = planner.createPlanFromKeywords("Give me a summary of the page");
    expect(plan.steps.some((s) => s.skill === "extract_content")).toBe(true);
  });

  test("detects fill keyword", () => {
    const plan = planner.createPlanFromKeywords("Fill the registration form");
    expect(plan.steps.some((s) => s.skill === "fill_form")).toBe(true);
  });

  test("detects form keyword", () => {
    const plan = planner.createPlanFromKeywords("Complete the form");
    expect(plan.steps.some((s) => s.skill === "fill_form")).toBe(true);
  });

  test("detects submit keyword", () => {
    const plan = planner.createPlanFromKeywords("Submit the request");
    expect(plan.steps.some((s) => s.skill === "submit_action")).toBe(true);
  });

  test("detects close ticket keyword", () => {
    const plan = planner.createPlanFromKeywords("Close ticket INC0042");
    expect(plan.steps.some((s) => s.skill === "submit_action")).toBe(true);
  });

  test("detects screenshot keyword", () => {
    const plan = planner.createPlanFromKeywords("Take a screenshot of the page");
    expect(plan.steps.some((s) => s.skill === "capture_screenshot")).toBe(true);
  });

  test("detects capture keyword", () => {
    const plan = planner.createPlanFromKeywords("Capture the current view");
    expect(plan.steps.some((s) => s.skill === "capture_screenshot")).toBe(true);
  });

  test("detects compare keyword", () => {
    const plan = planner.createPlanFromKeywords("Compare the two reports");
    expect(plan.steps.some((s) => s.skill === "compare_data")).toBe(true);
  });

  test("detects discover keyword", () => {
    const plan = planner.createPlanFromKeywords("Discover available APIs");
    expect(plan.steps.some((s) => s.skill === "discover_apis")).toBe(true);
  });

  test("detects api keyword", () => {
    const plan = planner.createPlanFromKeywords("Check the API endpoints");
    expect(plan.steps.some((s) => s.skill === "discover_apis")).toBe(true);
  });

  test("detects teams keyword", () => {
    const plan = planner.createPlanFromKeywords("Send a Teams message to the team");
    expect(plan.steps.some((s) => s.skill === "send_teams_message")).toBe(true);
  });

  test("detects message keyword", () => {
    const plan = planner.createPlanFromKeywords("Message the stakeholders");
    expect(plan.steps.some((s) => s.skill === "send_teams_message")).toBe(true);
  });

  test("detects notify keyword", () => {
    const plan = planner.createPlanFromKeywords("Notify the managers");
    expect(plan.steps.some((s) => s.skill === "send_teams_message")).toBe(true);
  });

  test("detects calendar keyword", () => {
    const plan = planner.createPlanFromKeywords("Check my calendar for tomorrow");
    expect(plan.steps.some((s) => s.skill === "manage_calendar")).toBe(true);
  });

  test("detects meeting keyword", () => {
    const plan = planner.createPlanFromKeywords("Schedule a meeting with the team");
    expect(plan.steps.some((s) => s.skill === "manage_calendar")).toBe(true);
  });

  test("detects schedule keyword", () => {
    const plan = planner.createPlanFromKeywords("Schedule a review session");
    expect(plan.steps.some((s) => s.skill === "manage_calendar")).toBe(true);
  });

  test("falls back to orchestrate_workflow when no keywords match", () => {
    const plan = planner.createPlanFromKeywords("Do something random");
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]!.skill).toBe("orchestrate_workflow");
  });

  test("extracts URL from prompt", () => {
    const plan = planner.createPlanFromKeywords(
      "Navigate to https://servicenow.example.com/incidents",
    );
    expect(plan.steps[0]!.params.url).toBe(
      "https://servicenow.example.com/incidents",
    );
  });

  test("uses default URL when none found", () => {
    const plan = planner.createPlanFromKeywords("Navigate to the dashboard");
    expect(plan.steps[0]!.params.url).toBe("https://example.com");
  });

  test("handles multi-keyword prompts", () => {
    const plan = planner.createPlanFromKeywords(
      "Navigate to Jira, extract the table, then submit the form",
    );
    const skills = plan.steps.map((s) => s.skill);
    expect(skills).toContain("navigate_page");
    expect(skills).toContain("extract_content");
    expect(skills).toContain("submit_action");
    expect(skills).toContain("fill_form");
  });
});
