import type { SkillExecutionContext, SkillResult, SkillInvocation } from "../types/skills.js";
import { getSkill } from "./index.js";

const MAX_WORKFLOW_STEPS = 25;

export async function orchestrateWorkflow(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  if (!Array.isArray(params.steps)) {
    return {
      skill: "orchestrate_workflow",
      success: false,
      error: "Invalid workflow: steps must be an array",
      data: { results: [] },
      path: "dom",
      durationMs: Date.now() - startedAt,
    };
  }

  const steps = params.steps as SkillInvocation[];
  if (steps.length > MAX_WORKFLOW_STEPS) {
    return {
      skill: "orchestrate_workflow",
      success: false,
      error: `Invalid workflow: max ${MAX_WORKFLOW_STEPS} steps allowed`,
      data: { results: [] },
      path: "dom",
      durationMs: Date.now() - startedAt,
    };
  }

  const results: SkillResult[] = [];

  for (const step of steps) {
    const handler = getSkill(step.skill);
    if (!handler) {
      results.push({
        skill: step.skill,
        success: false,
        error: `Unknown skill: ${step.skill}`,
        durationMs: 0,
      });
      break;
    }

    const safeStepParams =
      typeof step.params === "object" && step.params !== null ? step.params : {};

    const resolvedParams = JSON.parse(
      JSON.stringify(safeStepParams).replace(
        /\{\{lastResult\}\}/g,
        JSON.stringify(results.at(-1)?.data ?? {}),
      ),
    ) as Record<string, unknown>;

    try {
      const result = await handler(resolvedParams, context);
      results.push(result);
      if (!result.success) {
        break;
      }
    } catch (err) {
      results.push({
        skill: step.skill,
        success: false,
        error: (err as Error).message,
        durationMs: 0,
      });
      break;
    }
  }

  return {
    skill: "orchestrate_workflow",
    success: results.every((result) => result.success),
    data: { results },
    path: "dom",
    durationMs: Date.now() - startedAt,
  };
}
