import { runtime, sessionManager } from "../runtime.js";
import type { SkillExecutionContext, SkillResult } from "../types/skills.js";

export async function fillForm(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  const url =
    typeof params.url === "string" && params.url.trim().length > 0
      ? params.url.trim()
      : undefined;
  const fields =
    typeof params.fields === "object" && params.fields !== null
      ? (params.fields as Record<string, string | boolean>)
      : {};

  if (Object.keys(fields).length === 0) {
    throw new Error("fields must contain at least one entry");
  }

  const secured = await runtime.securityGate.executeWithSecurity(
    "fill_form",
    { url, fields },
    context,
    async (token) => {
      if (url) {
        const decision = await runtime.dualPathRouter.decide(url);
        if (decision.path === "api") {
          const data = await runtime.restConnector.request("PATCH", url, token, { fields });
          return { data, path: "api" as const };
        }
      }

      const page = sessionManager.getPage(context.sessionId);
      if (!page) {
        throw new Error("No active browser session. Call navigate_page first.");
      }

      for (const [name, value] of Object.entries(fields)) {
        const locator = page.locator(`[name='${name}'],#${name}`).first();
        const type = await locator.getAttribute("type");
        if (type === "checkbox") {
          if (value) {
            await locator.check();
          } else {
            await locator.uncheck();
          }
        } else {
          await locator.fill(String(value));
        }
      }

      return { data: { filledFields: Object.keys(fields) }, path: "dom" as const };
    },
  );

  return {
    skill: "fill_form",
    success: true,
    data: secured.data,
    path: secured.path,
    durationMs: Date.now() - startedAt,
  };
}
