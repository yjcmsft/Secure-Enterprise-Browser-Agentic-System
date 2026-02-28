import type { BrowserContext, Page } from "playwright";
import type { BrowserPool } from "./browser-pool.js";
import type { BrowserSession } from "../types/browser.js";

export class SessionManager {
  private readonly sessions = new Map<string, BrowserSession>();

  public constructor(
    private readonly pool: BrowserPool,
    private readonly ttlMs: number,
  ) {}

  public async getOrCreateSession(userId: string, sessionId: string): Promise<BrowserSession> {
    this.cleanupExpired();
    const existing = this.sessions.get(sessionId);
    if (existing) {
      existing.lastUsedAt = Date.now();
      return existing;
    }

    const browser = await this.pool.getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    const session: BrowserSession = {
      userId,
      sessionId,
      context,
      page,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  public async injectAuth(context: BrowserContext, token: string): Promise<void> {
    await context.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` });
  }

  public getPage(sessionId: string): Page | undefined {
    return this.sessions.get(sessionId)?.page;
  }

  public async closeAll(): Promise<void> {
    const closePromises = Array.from(this.sessions.values()).map((session) => session.context.close());
    await Promise.all(closePromises);
    this.sessions.clear();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastUsedAt > this.ttlMs) {
        void session.context.close();
        this.sessions.delete(key);
      }
    }
  }
}
