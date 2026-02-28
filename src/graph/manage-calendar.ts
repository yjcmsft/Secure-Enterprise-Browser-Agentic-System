import { runtime } from "../runtime.js";
import type { SkillExecutionContext, SkillResult } from "../types/skills.js";
import { withGraphClient } from "./client.js";

export async function manageCalendar(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  const action = String(params.action ?? "create");
  const requiredPermissions =
    action === "list" ? ["Calendars.Read"] : ["Calendars.ReadWrite"];

  const secured = await runtime.securityGate.executeWithSecurity(
    "manage_calendar",
    params,
    context,
    async () => {
      const response = await withGraphClient(context, async (client) => {
        if (action === "list") {
          return client.api("/me/events").top(20).get();
        }

        if (action === "update") {
          const eventId = String(params.eventId ?? "");
          if (!eventId) {
            throw new Error("eventId is required for update action");
          }
          return client.api(`/me/events/${eventId}`).patch(params.event ?? {});
        }

        return client.api("/me/events").post(params.event ?? {});
      }, {
        requiredPermissions,
      });

      return { data: response as Record<string, unknown>, path: "graph" as const };
    },
  );

  return {
    skill: "manage_calendar",
    success: true,
    path: secured.path,
    data: secured.data,
    durationMs: Date.now() - startedAt,
  };
}
