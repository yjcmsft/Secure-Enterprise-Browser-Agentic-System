import { describe, expect, test } from "vitest";
import { TaskPlanner } from "../../../src/orchestrator/task-planner.js";

describe("TaskPlanner keyword heuristics", () => {
  const planner = new TaskPlanner();

  test("detects navigate + extract intent", () => {
    const plan = planner.createPlanFromKeywords("navigate to https://example.com and extract data");
    const skills = plan.steps.map((s) => s.skill);
    expect(skills).toContain("navigate_page");
    expect(skills).toContain("extract_content");
  });

  test("detects fill + submit intent", () => {
    const plan = planner.createPlanFromKeywords("fill the form and submit it");
    const skills = plan.steps.map((s) => s.skill);
    expect(skills).toContain("fill_form");
    expect(skills).toContain("submit_action");
  });

  test("detects screenshot keyword", () => {
    const plan = planner.createPlanFromKeywords("capture a screenshot of the page");
    const skills = plan.steps.map((s) => s.skill);
    expect(skills).toContain("capture_screenshot");
  });

  test("detects compare keyword", () => {
    const plan = planner.createPlanFromKeywords("compare pricing data across sites");
    const skills = plan.steps.map((s) => s.skill);
    expect(skills).toContain("compare_data");
  });

  test("detects API discovery keyword", () => {
    const plan = planner.createPlanFromKeywords("discover available APIs on this app");
    const skills = plan.steps.map((s) => s.skill);
    expect(skills).toContain("discover_apis");
  });

  test("detects teams message keyword", () => {
    const plan = planner.createPlanFromKeywords("send a teams notification to the team");
    const skills = plan.steps.map((s) => s.skill);
    expect(skills).toContain("send_teams_message");
  });

  test("detects calendar/meeting keyword", () => {
    const plan = planner.createPlanFromKeywords("schedule a meeting for onboarding");
    const skills = plan.steps.map((s) => s.skill);
    expect(skills).toContain("manage_calendar");
  });

  test("falls back to orchestrate_workflow for unrecognized prompt", () => {
    const plan = planner.createPlanFromKeywords("do something completely unrelated");
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]?.skill).toBe("orchestrate_workflow");
  });

  test("extracts URL from prompt", () => {
    const plan = planner.createPlanFromKeywords("open https://learn.microsoft.com/docs");
    const navStep = plan.steps.find((s) => s.skill === "navigate_page");
    expect(navStep?.params.url).toBe("https://learn.microsoft.com/docs");
  });

  test("uses fallback URL when no URL in prompt", () => {
    const plan = planner.createPlanFromKeywords("navigate to the dashboard");
    const navStep = plan.steps.find((s) => s.skill === "navigate_page");
    expect(navStep?.params.url).toBe("https://example.com");
  });

  test("async createPlan falls back to keywords when no OpenAI configured", async () => {
    const plan = await planner.createPlan("navigate to https://example.com");
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps[0]?.skill).toBe("navigate_page");
  });
});
