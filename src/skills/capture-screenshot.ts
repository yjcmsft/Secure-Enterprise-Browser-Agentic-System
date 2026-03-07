import { runtime, sessionManager } from "../runtime.js";
import type { SkillExecutionContext, SkillResult } from "../types/skills.js";

export async function captureScreenshot(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  const selector = typeof params.selector === "string" ? params.selector : undefined;
  const url = typeof params.url === "string" ? params.url : undefined;

  const secured = await runtime.securityGate.executeWithSecurity(
    "capture_screenshot",
    params,
    context,
    async () => {
      let page = sessionManager.getPage(context.sessionId);

      // If no active session but URL provided, create one and navigate
      if (!page && url) {
        const session = await sessionManager.getOrCreateSession(context.userId, context.sessionId);
        await session.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        page = session.page;
      }

      if (!page) {
        throw new Error("No active browser session. Call navigate_page first or provide a URL.");
      }

      let screenshot: Buffer;
      if (selector) {
        screenshot = await page.locator(selector).first().screenshot();
      } else {
        screenshot = await page.screenshot({ fullPage: true });
      }

      return {
        data: { imageBase64: screenshot.toString("base64") },
        path: "dom" as const,
      };
    },
  );

  return {
    skill: "capture_screenshot",
    success: true,
    data: secured.data,
    path: secured.path,
    durationMs: Date.now() - startedAt,
  };
}
