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

  // Compute real duration from event start/end when available
  let totalMeetingMinutes = 0;
  let longestMeetingMinutes = 0;
  let backToBackCount = 0;
  const sortedEvents = events
    .filter((e) => e.start && e.end)
    .map((e) => ({
      start: new Date(String((e.start as { dateTime?: string })?.dateTime ?? e.start)).getTime(),
      end: new Date(String((e.end as { dateTime?: string })?.dateTime ?? e.end)).getTime(),
    }))
    .sort((a, b) => a.start - b.start);

  for (let i = 0; i < sortedEvents.length; i++) {
    const evt = sortedEvents[i]!;
    const durationMin = Math.round((evt.end - evt.start) / 60_000);
    totalMeetingMinutes += durationMin;
    if (durationMin > longestMeetingMinutes) {
      longestMeetingMinutes = durationMin;
    }
    // Back-to-back: next meeting starts within 5 minutes of this one ending
    if (i > 0) {
      const prevEnd = sortedEvents[i - 1]!.end;
      if (evt.start - prevEnd <= 5 * 60_000) {
        backToBackCount++;
      }
    }
  }

  const avgMeetingMinutes = meetingCount > 0 ? Math.round(totalMeetingMinutes / meetingCount) : 0;
  const weeklyWorkMinutes = 5 * 8 * 60; // 2400 minutes
  const focusTimeRecovered = Math.max(0, weeklyWorkMinutes - totalMeetingMinutes);
  const contextSwitchesAvoided = Math.max(0, meetingCount - backToBackCount);
  const collaborationVelocity = meetingCount > 0
    ? Math.round((1 - totalMeetingMinutes / weeklyWorkMinutes) * 100)
    : 100;

  return {
    skill: "analyze_work_patterns",
    success: true,
    path: "graph",
    data: {
      scope,
      metrics: {
        time_saved: totalMeetingMinutes,
        focus_time_recovered: focusTimeRecovered,
        context_switches_avoided: contextSwitchesAvoided,
        collaboration_velocity: Math.max(0, collaborationVelocity),
        error_reduction: Math.min(100, Math.round((focusTimeRecovered / weeklyWorkMinutes) * 100)),
        meeting_impact: meetingCount,
        avg_meeting_duration_min: avgMeetingMinutes,
        longest_meeting_min: longestMeetingMinutes,
        back_to_back_meetings: backToBackCount,
      },
      sampled_events: meetingCount,
    },
    durationMs: Date.now() - startedAt,
  };
}
