import { runtime } from "../runtime.js";
import type { SkillExecutionContext, SkillResult } from "../types/skills.js";

export async function discoverApis(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  const baseUrl = String(params.baseUrl ?? "");

  const secured = await runtime.securityGate.executeWithSecurity(
    "discover_apis",
    { url: baseUrl },
    context,
    async () => {
      const schema = await runtime.dualPathRouter.getDiscovery().discover(baseUrl);
      return {
        data: schema ?? { sourceUrl: baseUrl, endpoints: [] },
        path: "api" as const,
      };
    },
  );

  return {
    skill: "discover_apis",
    success: true,
    data: secured.data,
    path: secured.path,
    durationMs: Date.now() - startedAt,
  };
}
