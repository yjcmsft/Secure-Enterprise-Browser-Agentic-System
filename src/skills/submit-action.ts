import { runtime, sessionManager } from "../runtime.js";
import type { SkillExecutionContext, SkillResult } from "../types/skills.js";

export async function submitAction(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  const url =
    typeof params.url === "string" && params.url.trim().length > 0
      ? params.url.trim()
      : undefined;
  const selector = String(params.selector ?? "button[type='submit']");
  if (!selector.trim()) {
    throw new Error("selector is required for submit_action");
  }

  const secured = await runtime.securityGate.executeWithSecurity(
    "submit_action",
    { url, selector },
    context,
    async (token) => {
      if (url) {
        const decision = await runtime.dualPathRouter.decide(url);
        if (decision.path === "api") {
          const data = await runtime.restConnector.request("POST", url, token, params.payload ?? {});
          return { data, path: "api" as const };
        }
      }

      const page = sessionManager.getPage(context.sessionId);
      if (!page) {
        throw new Error("No active browser session. Call navigate_page first.");
      }
      await page.click(selector);
      return { data: { submitted: true }, path: "dom" as const };
    },
  );

  return {
    skill: "submit_action",
    success: true,
    data: secured.data,
    path: secured.path,
    durationMs: Date.now() - startedAt,
  };
}
