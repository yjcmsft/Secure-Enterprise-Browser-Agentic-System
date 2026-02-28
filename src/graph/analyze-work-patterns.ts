import type { SkillExecutionContext, SkillResult } from "../types/skills.js";
import { withGraphClient } from "./client.js";

export async function analyzeWorkPatterns(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  const startedAt = Date.now();
  const scope = String(params.scope ?? "personal");

  const events = (await withGraphClient(context, async (client) => {
    const result = await client.api("/me/events").top(20).get();
    return (result.value ?? []) as Array<Record<string, unknown>>;
  }, {
    requiredPermissions: ["Calendars.Read"],
  })) as Array<Record<string, unknown>>;

  const meetingCount = events.length;
  const averageMinutes = 30;
  const focusTimeRecovered = Math.max(0, 600 - meetingCount * averageMinutes);

  return {
    skill: "analyze_work_patterns",
    success: true,
    path: "graph",
    data: {
      scope,
      metrics: {
        time_saved: Math.round(meetingCount * 2.5),
        focus_time_recovered: focusTimeRecovered,
        context_switches_avoided: Math.round(meetingCount * 1.2),
        collaboration_velocity: Math.max(0, 100 - meetingCount),
        error_reduction: Math.min(40, meetingCount),
        meeting_impact: meetingCount,
      },
      sampled_events: meetingCount,
    },
    durationMs: Date.now() - startedAt,
  };
}
