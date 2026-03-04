import { describe, expect, test } from "vitest";
import {
  functionTools,
  AGENT_INSTRUCTIONS,
  getFoundryAgent,
} from "../../src/foundry-agent.js";

describe("Foundry Agent function tool definitions", () => {
  test("exports 8 function tool definitions", () => {
    expect(functionTools).toHaveLength(8);
  });

  test("all tools have type function", () => {
    for (const tool of functionTools) {
      expect(tool.type).toBe("function");
    }
  });

  test("all tools have name and description", () => {
    for (const tool of functionTools) {
      expect(tool.function.name).toBeTruthy();
      expect(tool.function.description).toBeTruthy();
    }
  });

  test("tool names match expected skills", () => {
    const names = functionTools.map((t) => t.function.name);
    expect(names).toContain("navigate_page");
    expect(names).toContain("extract_content");
    expect(names).toContain("fill_form");
    expect(names).toContain("submit_action");
    expect(names).toContain("discover_apis");
    expect(names).toContain("capture_screenshot");
    expect(names).toContain("compare_data");
    expect(names).toContain("orchestrate_workflow");
  });

  test("navigate_page requires url parameter", () => {
    const nav = functionTools.find((t) => t.function.name === "navigate_page");
    expect(nav!.function.parameters!.required).toContain("url");
  });

  test("fill_form requires fields parameter", () => {
    const fill = functionTools.find((t) => t.function.name === "fill_form");
    expect(fill!.function.parameters!.required).toContain("fields");
  });

  test("compare_data requires urls parameter", () => {
    const compare = functionTools.find((t) => t.function.name === "compare_data");
    expect(compare!.function.parameters!.required).toContain("urls");
  });

  test("orchestrate_workflow requires steps parameter", () => {
    const orch = functionTools.find((t) => t.function.name === "orchestrate_workflow");
    expect(orch!.function.parameters!.required).toContain("steps");
  });

  test("each tool has valid parameters schema", () => {
    for (const tool of functionTools) {
      const params = tool.function.parameters;
      expect(params).toBeDefined();
      expect(params!.type).toBe("object");
      expect(params!.properties).toBeDefined();
    }
  });

  test("extract_content mode has enum values", () => {
    const extract = functionTools.find((t) => t.function.name === "extract_content");
    const modeSchema = (extract!.function.parameters!.properties as Record<string, { enum?: string[] }>).mode;
    expect(modeSchema.enum).toContain("all");
    expect(modeSchema.enum).toContain("text");
    expect(modeSchema.enum).toContain("table");
    expect(modeSchema.enum).toContain("links");
    expect(modeSchema.enum).toContain("form_values");
  });
});

describe("Agent Instructions", () => {
  test("contains security rules", () => {
    expect(AGENT_INSTRUCTIONS).toContain("URL allowlist");
    expect(AGENT_INSTRUCTIONS).toContain("approval");
  });

  test("contains workflow rules", () => {
    expect(AGENT_INSTRUCTIONS).toContain("orchestrate_workflow");
    expect(AGENT_INSTRUCTIONS).toContain("compare_data");
  });

  test("mentions target applications", () => {
    expect(AGENT_INSTRUCTIONS).toContain("ServiceNow");
    expect(AGENT_INSTRUCTIONS).toContain("Jira");
    expect(AGENT_INSTRUCTIONS).toContain("Workday");
    expect(AGENT_INSTRUCTIONS).toContain("Grafana");
  });

  test("contains API-first guidance", () => {
    expect(AGENT_INSTRUCTIONS).toContain("REST/GraphQL");
    expect(AGENT_INSTRUCTIONS).toContain("DOM scraping");
  });
});

describe("getFoundryAgent", () => {
  test("returns null when agent is not started", () => {
    expect(getFoundryAgent()).toBeNull();
  });
});
