import { runtime, sessionManager } from "../runtime.js";
import type { SkillExecutionContext, SkillResult } from "../types/skills.js";

export async function navigatePage(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  const url = String(params.url ?? "");
  const waitFor = typeof params.waitFor === "string" ? params.waitFor : undefined;
  const clickText = typeof params.clickText === "string" ? params.clickText : undefined;

  const secured = await runtime.securityGate.executeWithSecurity(
    "navigate_page",
    { url, waitFor, clickText },
    context,
    async (token) => {
      const decision = await runtime.dualPathRouter.decide(url);
      if (decision.path === "api") {
        const data = await runtime.restConnector.request("GET", url, token);
        return { data, path: "api" as const };
      }

      const session = await sessionManager.getOrCreateSession(context.userId, context.sessionId);
      await sessionManager.injectAuth(session.context, token);
      await session.page.goto(url, { waitUntil: "networkidle" });
      if (waitFor) {
        await session.page.waitForSelector(waitFor, { timeout: 10000 });
      }
      if (clickText) {
        await session.page.getByText(clickText).first().click();
      }

      return {
        data: {
          title: await session.page.title(),
          url: session.page.url(),
        },
        path: "dom" as const,
      };
    },
  );

  return {
    skill: "navigate_page",
    success: true,
    data: secured.data,
    path: secured.path,
    durationMs: Date.now() - startedAt,
  };
}
