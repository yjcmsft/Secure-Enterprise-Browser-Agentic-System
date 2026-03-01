import { createLogger, format, transports } from "winston";
import type { SkillExecutionContext, SkillResult } from "../types/skills.js";
import { getSkill } from "../skills/index.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

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

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await handler(params, context);
        return result;
      } catch (err) {
        lastError = err;
        const isRetryable =
          err instanceof Error &&
          (err.message.includes("ECONNRESET") ||
            err.message.includes("ETIMEDOUT") ||
            err.message.includes("ECONNREFUSED") ||
            err.message.includes("socket hang up"));

        if (!isRetryable || attempt === MAX_RETRIES) break;

        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        logger.warn("tool-router-retry", { skillName, attempt: attempt + 1, delay });
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    return {
      skill: skillName as never,
      success: false,
      error: lastError instanceof Error ? lastError.message : String(lastError),
      durationMs: 0,
    };
  }
}
