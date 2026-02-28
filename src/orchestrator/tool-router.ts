import type { SkillExecutionContext, SkillResult } from "../types/skills.js";
import { getSkill } from "../skills/index.js";

export class ToolRouter {
  public async run(
    skillName: string,
    params: Record<string, unknown>,
    context: SkillExecutionContext,
  ): Promise<SkillResult> {
    const handler = getSkill(skillName as never);
    if (!handler) {
      return {
        skill: "orchestrate_workflow",
        success: false,
        error: `Unknown skill: ${skillName}`,
        durationMs: 0,
      };
    }

    return handler(params, context);
  }
}
