import { describe, expect, test, vi, beforeEach } from "vitest";
import type { SkillExecutionContext } from "../../../src/types/skills.js";

// Mock the runtime module for graph skill tests
const mockSecurityGate = {
  executeWithSecurity: vi.fn(
    async (
      _skill: string,
      _params: Record<string, unknown>,
      _context: SkillExecutionContext,
      handler: (token: string) => Promise<{ data: unknown; path: string }>,
    ) => {
      return handler("mock-token");
    },
  ),
};

vi.mock("../../../src/runtime.js", () => ({
  runtime: {
    securityGate: mockSecurityGate,
  },
  sessionManager: {},
}));

// Mock the graph client module
const mockGraphApi = {
  top: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue({ value: [] }),
  post: vi.fn().mockResolvedValue({ id: "msg-1" }),
  patch: vi.fn().mockResolvedValue({ id: "evt-1" }),
};

const mockGraphClient = {
  api: vi.fn().mockReturnValue(mockGraphApi),
};

vi.mock("../../../src/graph/client.js", () => ({
  withGraphClient: vi.fn(
    async (
      _context: SkillExecutionContext,
      operation: (client: typeof mockGraphClient) => Promise<unknown>,
    ) => {
      return operation(mockGraphClient);
    },
  ),
}));

const ctx: SkillExecutionContext = { userId: "user1", sessionId: "s1" };

describe("sendTeamsMessage", () => {
  let sendTeamsMessage: typeof import("../../../src/graph/send-teams-message.js").sendTeamsMessage;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../src/graph/send-teams-message.js");
    sendTeamsMessage = mod.sendTeamsMessage;
  });

  test("sends message to chat", async () => {
    const result = await sendTeamsMessage(
      { chatId: "chat-1", message: "Hello Team!" },
      ctx,
    );
    expect(result.skill).toBe("send_teams_message");
    expect(result.success).toBe(true);
    expect(mockGraphClient.api).toHaveBeenCalledWith("/chats/chat-1/messages");
  });

  test("sends message to team channel", async () => {
    const result = await sendTeamsMessage(
      { teamId: "team-1", channelId: "chan-1", message: "Update" },
      ctx,
    );
    expect(result.success).toBe(true);
    expect(mockGraphClient.api).toHaveBeenCalledWith("/teams/team-1/channels/chan-1/messages");
  });

  test("throws when no chatId or teamId+channelId", async () => {
    await expect(sendTeamsMessage({ message: "Hello" }, ctx)).rejects.toThrow(
      "Either chatId or teamId + channelId",
    );
  });
});

describe("manageCalendar", () => {
  let manageCalendar: typeof import("../../../src/graph/manage-calendar.js").manageCalendar;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../src/graph/manage-calendar.js");
    manageCalendar = mod.manageCalendar;
  });

  test("creates calendar event by default", async () => {
    const result = await manageCalendar(
      { event: { subject: "Meeting" } },
      ctx,
    );
    expect(result.skill).toBe("manage_calendar");
    expect(result.success).toBe(true);
    expect(mockGraphClient.api).toHaveBeenCalledWith("/me/events");
  });

  test("lists calendar events", async () => {
    const result = await manageCalendar({ action: "list" }, ctx);
    expect(result.success).toBe(true);
  });

  test("updates calendar event", async () => {
    const result = await manageCalendar(
      { action: "update", eventId: "evt-1", event: { subject: "Updated" } },
      ctx,
    );
    expect(result.success).toBe(true);
    expect(mockGraphClient.api).toHaveBeenCalledWith("/me/events/evt-1");
  });

  test("throws when updating without eventId", async () => {
    await expect(
      manageCalendar({ action: "update", event: {} }, ctx),
    ).rejects.toThrow("eventId is required");
  });
});

describe("analyzeWorkPatterns", () => {
  let analyzeWorkPatterns: typeof import("../../../src/graph/analyze-work-patterns.js").analyzeWorkPatterns;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../src/graph/analyze-work-patterns.js");
    analyzeWorkPatterns = mod.analyzeWorkPatterns;
  });

  test("returns metrics with no events", async () => {
    mockGraphApi.get.mockResolvedValueOnce({ value: [] });
    const result = await analyzeWorkPatterns({}, ctx);
    expect(result.skill).toBe("analyze_work_patterns");
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("metrics");
    const metrics = (result.data as Record<string, Record<string, number>>).metrics;
    expect(metrics.meeting_impact).toBe(0);
    expect(metrics.collaboration_velocity).toBe(100);
  });

  test("computes metrics from calendar events", async () => {
    const now = new Date();
    const events = [
      {
        start: { dateTime: new Date(now.getTime() - 60 * 60 * 1000).toISOString() },
        end: { dateTime: now.toISOString() },
      },
      {
        start: { dateTime: new Date(now.getTime() + 5 * 60 * 1000).toISOString() },
        end: { dateTime: new Date(now.getTime() + 65 * 60 * 1000).toISOString() },
      },
    ];
    mockGraphApi.get.mockResolvedValueOnce({ value: events });

    const result = await analyzeWorkPatterns({ scope: "team" }, ctx);
    expect(result.success).toBe(true);
    const metrics = (result.data as Record<string, Record<string, number>>).metrics;
    expect(metrics.meeting_impact).toBe(2);
    expect(metrics.avg_meeting_duration_min).toBeGreaterThan(0);
    expect(metrics.back_to_back_meetings).toBeGreaterThanOrEqual(0);
  });

  test("detects back-to-back meetings", async () => {
    const now = new Date();
    const events = [
      {
        start: { dateTime: new Date(now.getTime()).toISOString() },
        end: { dateTime: new Date(now.getTime() + 30 * 60000).toISOString() },
      },
      {
        start: { dateTime: new Date(now.getTime() + 31 * 60000).toISOString() },
        end: { dateTime: new Date(now.getTime() + 61 * 60000).toISOString() },
      },
    ];
    mockGraphApi.get.mockResolvedValueOnce({ value: events });

    const result = await analyzeWorkPatterns({}, ctx);
    const metrics = (result.data as Record<string, Record<string, number>>).metrics;
    expect(metrics.back_to_back_meetings).toBe(1);
  });
});
