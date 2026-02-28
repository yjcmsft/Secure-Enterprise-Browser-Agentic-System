import type { BrowserContext, Page } from "playwright";

export interface BrowserSession {
  sessionId: string;
  userId: string;
  context: BrowserContext;
  page: Page;
  createdAt: number;
  lastUsedAt: number;
}

export interface BrowserPoolOptions {
  maxConcurrency: number;
  idleTimeoutMs: number;
}

export interface ExtractedLink {
  text: string;
  href: string;
}

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
}

export interface ParsedDomContent {
  textBlocks: string[];
  links: ExtractedLink[];
  tables: ExtractedTable[];
}
