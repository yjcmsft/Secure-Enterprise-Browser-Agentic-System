import { describe, expect, test } from "vitest";
import { getSkill, listSkills } from "../../../src/skills/index.js";

describe("Skill registry", () => {
  test("contains all required skills", () => {
    const skills = listSkills();
    expect(skills).toContain("navigate_page");
    expect(skills).toContain("analyze_work_patterns");
    expect(skills.length).toBe(12);
  });

  test("returns handler for known skill", () => {
    expect(getSkill("navigate_page")).toBeTypeOf("function");
  });
});
