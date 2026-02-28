import { runtime, sessionManager } from "../runtime.js";
import type { SkillExecutionContext, SkillResult } from "../types/skills.js";

export async function extractContent(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  const url = typeof params.url === "string" ? params.url : undefined;
  const mode = String(params.mode ?? "all");

  const secured = await runtime.securityGate.executeWithSecurity(
    "extract_content",
    { url, mode },
    context,
    async (token) => {
      if (url) {
        const decision = await runtime.dualPathRouter.decide(url);
        if (decision.path === "api") {
          const data = await runtime.restConnector.request("GET", url, token);
          return { data, path: "api" as const };
        }
      }

      const page = sessionManager.getPage(context.sessionId);
      if (!page) {
        throw new Error("No active browser session. Call navigate_page first.");
      }
      const html = await page.content();
      const all = runtime.domParser.extractAll(html);

      if (mode === "table") {
        return { data: { tables: all.tables }, path: "dom" as const };
      }
      if (mode === "text") {
        return { data: { textBlocks: all.textBlocks }, path: "dom" as const };
      }
      if (mode === "links") {
        return { data: { links: all.links }, path: "dom" as const };
      }
      if (mode === "form_values") {
        const values = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll("input,textarea,select"));
          return inputs.map((input) => ({
            name: input.getAttribute("name") ?? input.id,
            value: (input as HTMLInputElement).value,
          }));
        });
        return { data: { formValues: values }, path: "dom" as const };
      }

      return { data: all, path: "dom" as const };
    },
  );

  return {
    skill: "extract_content",
    success: true,
    data: secured.data,
    path: secured.path,
    durationMs: Date.now() - startedAt,
  };
}
