import { describe, expect, test } from "vitest";
import { getSessionState } from "../../src/agui-handler.js";

// Also test the EventType import and handler structure
import { EventType } from "@ag-ui/core";

describe("AG-UI session state", () => {
  test("getSessionState returns undefined for unknown session", () => {
    const state = getSessionState("nonexistent-session-id");
    expect(state).toBeUndefined();
  });

  test("getSessionState returns undefined for empty string sessionId", () => {
    const state = getSessionState("");
    expect(state).toBeUndefined();
  });
});

describe("AG-UI EventType", () => {
  test("has required event types for streaming", () => {
    expect(EventType.RUN_STARTED).toBeDefined();
    expect(EventType.RUN_FINISHED).toBeDefined();
    expect(EventType.RUN_ERROR).toBeDefined();
    expect(EventType.TEXT_MESSAGE_START).toBeDefined();
    expect(EventType.TEXT_MESSAGE_CONTENT).toBeDefined();
    expect(EventType.TEXT_MESSAGE_END).toBeDefined();
    expect(EventType.TOOL_CALL_START).toBeDefined();
    expect(EventType.TOOL_CALL_ARGS).toBeDefined();
    expect(EventType.TOOL_CALL_END).toBeDefined();
    expect(EventType.STATE_SNAPSHOT).toBeDefined();
  });
});
