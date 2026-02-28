import { chromium, type Browser } from "playwright";
import type { BrowserPoolOptions } from "../types/browser.js";

export class BrowserPool {
  private browser?: Browser;
  private active = 0;
  private readonly options: BrowserPoolOptions;

  public constructor(options: BrowserPoolOptions) {
    this.options = options;
  }

  public async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  public async withSlot<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.options.maxConcurrency) {
      throw new Error("Browser pool concurrency limit reached");
    }
    this.active += 1;
    try {
      return await fn();
    } finally {
      this.active -= 1;
    }
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }
}
