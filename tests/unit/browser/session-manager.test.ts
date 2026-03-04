import { describe, expect, test, vi, beforeEach } from "vitest";
import { SessionManager } from "../../../src/browser/session-manager.js";
import type { BrowserPool } from "../../../src/browser/browser-pool.js";

function createMockPool(): BrowserPool {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    title: vi.fn().mockResolvedValue("Test Page"),
    url: vi.fn().mockReturnValue("https://example.com"),
    content: vi.fn().mockResolvedValue("<html></html>"),
  };

  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
    setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
  };

  return {
    getBrowser: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue(mockContext),
    }),
    withSlot: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as BrowserPool;
}

describe("SessionManager", () => {
  let manager: SessionManager;
  let pool: BrowserPool;

  beforeEach(() => {
    pool = createMockPool();
    manager = new SessionManager(pool, 60000);
  });

  test("creates a new session for unknown sessionId", async () => {
    const session = await manager.getOrCreateSession("user1", "session1");
    expect(session.userId).toBe("user1");
    expect(session.sessionId).toBe("session1");
    expect(session.page).toBeDefined();
  });

  test("reuses existing session", async () => {
    const s1 = await manager.getOrCreateSession("user1", "session1");
    const s2 = await manager.getOrCreateSession("user1", "session1");
    expect(s1).toBe(s2);
  });

  test("getPage returns page for existing session", async () => {
    await manager.getOrCreateSession("user1", "session1");
    const page = manager.getPage("session1");
    expect(page).toBeDefined();
  });

  test("getPage returns undefined for unknown session", () => {
    const page = manager.getPage("nonexistent");
    expect(page).toBeUndefined();
  });

  test("injectAuth sets authorization header", async () => {
    const session = await manager.getOrCreateSession("user1", "session1");
    await manager.injectAuth(session.context, "test-token");
    expect(session.context.setExtraHTTPHeaders).toHaveBeenCalledWith({
      Authorization: "Bearer test-token",
    });
  });

  test("closeAll clears all sessions", async () => {
    await manager.getOrCreateSession("user1", "s1");
    await manager.getOrCreateSession("user2", "s2");
    await manager.closeAll();
    expect(manager.getPage("s1")).toBeUndefined();
    expect(manager.getPage("s2")).toBeUndefined();
  });

  test("cleanupExpired removes stale sessions", async () => {
    // Create manager with very short TTL
    const shortManager = new SessionManager(pool, 1);
    await shortManager.getOrCreateSession("user1", "old-session");

    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 10));

    // Trigger cleanup by creating a new session
    await shortManager.getOrCreateSession("user2", "new-session");

    expect(shortManager.getPage("old-session")).toBeUndefined();
    expect(shortManager.getPage("new-session")).toBeDefined();
  });
});
