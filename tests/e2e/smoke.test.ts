import { describe, expect, test } from "vitest";
import { TaskPlanner } from "../../src/orchestrator/task-planner.js";

describe("E2E smoke", () => {
  test("planner creates at least one step", async () => {
    const planner = new TaskPlanner();
    const plan = await planner.createPlan("navigate to https://example.com and extract");
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  test("keyword planner covers fill, screenshot, compare keywords", () => {
    const planner = new TaskPlanner();
    const plan = planner.createPlanFromKeywords("fill a form and capture screenshot then compare data");
    const skills = plan.steps.map((s) => s.skill);
    expect(skills).toContain("fill_form");
    expect(skills).toContain("capture_screenshot");
    expect(skills).toContain("compare_data");
  });

  test("keyword planner handles teams + calendar keywords", () => {
    const planner = new TaskPlanner();
    const plan = planner.createPlanFromKeywords("send teams message and schedule a meeting");
    const skills = plan.steps.map((s) => s.skill);
    expect(skills).toContain("send_teams_message");
    expect(skills).toContain("manage_calendar");
  });
});
