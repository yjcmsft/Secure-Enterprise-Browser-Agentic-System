import axios from "axios";
import { config } from "../config.js";
import { listSkills } from "../skills/index.js";
import type { SkillInvocation, WorkflowPlan } from "../types/skills.js";

/**
 * TaskPlanner decomposes a user prompt into an ordered list of skill invocations.
 *
 * When Azure OpenAI is configured (AZURE_OPENAI_ENDPOINT), the planner uses
 * GPT-4o to decompose the intent. Otherwise it falls back to deterministic
 * keyword-based heuristics (useful for local development & unit tests).
 */
export class TaskPlanner {
  /**
   * Create a workflow plan from a user prompt.
   * Tries LLM planning first; falls back to keyword heuristics on failure or
   * when no Azure OpenAI endpoint is configured.
   */
  public async createPlan(prompt: string): Promise<WorkflowPlan> {
    if (config.AZURE_OPENAI_ENDPOINT) {
      try {
        return await this.createPlanWithLLM(prompt);
      } catch {
        // Degrade gracefully to keyword heuristics
      }
    }
    return this.createPlanFromKeywords(prompt);
  }

  // ---------------------------------------------------------------------------
  // LLM-based planning (Azure OpenAI GPT-4o)
  // ---------------------------------------------------------------------------
  private async createPlanWithLLM(prompt: string): Promise<WorkflowPlan> {
    const endpoint = config.AZURE_OPENAI_ENDPOINT!;
    const model = config.AZURE_OPENAI_MODEL;
    const availableSkills = listSkills();

    const systemPrompt = [
      "You are a task-planning engine for a secure enterprise browser-automation agent.",
      "Given a user request, decompose it into an ordered list of skill invocations.",
      `Available skills: ${availableSkills.join(", ")}.`,
      "Respond ONLY with a JSON array of objects, each with { skill, params }.",
      "params is a JSON object whose keys match the skill's parameter schema.",
      "Do not include explanatory text — only valid JSON.",
    ].join("\n");

    const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${model}/chat/completions?api-version=2024-06-01`;

    const { data } = await axios.post(
      url,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 2048,
      },
      {
        headers: {
          "Content-Type": "application/json",
          ...(process.env.AZURE_OPENAI_API_KEY
            ? { "api-key": process.env.AZURE_OPENAI_API_KEY }
            : {}),
        },
        timeout: 30_000,
      },
    );

    const content = (data as { choices: { message: { content: string } }[] }).choices?.[0]?.message?.content ?? "[]";

    // Strip markdown fences if present
    const json = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    const parsed: unknown = JSON.parse(json);

    if (!Array.isArray(parsed)) {
      throw new Error("LLM returned non-array plan");
    }

    const steps: SkillInvocation[] = (parsed as { skill: string; params: Record<string, unknown> }[])
      .filter((s) => availableSkills.includes(s.skill as never))
      .map((s) => ({ skill: s.skill as SkillInvocation["skill"], params: s.params ?? {} }));

    if (steps.length === 0) {
      throw new Error("LLM plan yielded zero usable steps");
    }

    return { steps };
  }

  // ---------------------------------------------------------------------------
  // Keyword-based fallback planning (deterministic, no external calls)
  // ---------------------------------------------------------------------------
  public createPlanFromKeywords(prompt: string): WorkflowPlan {
    const steps: SkillInvocation[] = [];
    const lower = prompt.toLowerCase();

    if (lower.includes("navigate") || lower.includes("open")) {
      steps.push({ skill: "navigate_page", params: { url: this.extractUrl(prompt) } });
    }
    if (lower.includes("extract") || lower.includes("table") || lower.includes("summary")) {
      steps.push({ skill: "extract_content", params: { mode: "all" } });
    }
    if (lower.includes("fill") || lower.includes("form")) {
      steps.push({ skill: "fill_form", params: { fields: {} } });
    }
    if (lower.includes("submit") || lower.includes("close ticket")) {
      steps.push({ skill: "submit_action", params: { selector: "button[type='submit']" } });
    }
    if (lower.includes("screenshot") || lower.includes("capture")) {
      steps.push({ skill: "capture_screenshot", params: {} });
    }
    if (lower.includes("compare")) {
      steps.push({ skill: "compare_data", params: { sources: [] } });
    }
    if (lower.includes("discover") || lower.includes("api")) {
      steps.push({ skill: "discover_apis", params: {} });
    }
    if (lower.includes("teams") || lower.includes("message") || lower.includes("notify")) {
      steps.push({ skill: "send_teams_message", params: {} });
    }
    if (lower.includes("calendar") || lower.includes("meeting") || lower.includes("schedule")) {
      steps.push({ skill: "manage_calendar", params: {} });
    }
    if (steps.length === 0) {
      steps.push({ skill: "orchestrate_workflow", params: { steps: [] } });
    }

    return { steps };
  }

  private extractUrl(prompt: string): string {
    const match = prompt.match(/https?:\/\/[^\s]+/i);
    return match?.[0] ?? "https://example.com";
  }
}
