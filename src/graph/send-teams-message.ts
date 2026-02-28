import { runtime } from "../runtime.js";
import type { SkillExecutionContext, SkillResult } from "../types/skills.js";
import { withGraphClient } from "./client.js";

export async function sendTeamsMessage(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  const teamId = String(params.teamId ?? "");
  const channelId = String(params.channelId ?? "");
  const chatId = String(params.chatId ?? "");
  const message = String(params.message ?? "");

  const secured = await runtime.securityGate.executeWithSecurity(
    "send_teams_message",
    { teamId, channelId, chatId, message },
    context,
    async () => {
      const response = await withGraphClient(context, async (client) => {
        if (chatId) {
          return client.api(`/chats/${chatId}/messages`).post({
            body: {
              contentType: "html",
              content: message,
            },
          });
        }

        if (!teamId || !channelId) {
          throw new Error("Either chatId or teamId + channelId must be provided");
        }

        return client.api(`/teams/${teamId}/channels/${channelId}/messages`).post({
          body: {
            contentType: "html",
            content: message,
          },
        });
      }, {
        requiredPermissions: ["Chat.ReadWrite"],
      });

      return { data: response as Record<string, unknown>, path: "graph" as const };
    },
  );

  return {
    skill: "send_teams_message",
    success: true,
    data: secured.data,
    path: secured.path,
    durationMs: Date.now() - startedAt,
  };
}
