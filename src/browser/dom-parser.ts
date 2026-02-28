import type { ExtractedLink, ExtractedTable, ParsedDomContent } from "../types/browser.js";

export class DomParser {
  public extractLinks(html: string): ExtractedLink[] {
    const matches = [...html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis)];
    return matches.map((match) => ({
      href: match[1],
      text: match[2].replace(/<[^>]+>/g, "").trim(),
    }));
  }

  public extractTables(html: string): ExtractedTable[] {
    const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((item) => item[0]);
    return tables.map((tableHtml) => {
      const headers = [...tableHtml.matchAll(/<th[^>]*>(.*?)<\/th>/gi)].map((m) =>
        m[1].replace(/<[^>]+>/g, "").trim(),
      );
      const rows = [...tableHtml.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)]
        .map((row) => [...row[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi)])
        .map((cells) => cells.map((cell) => cell[1].replace(/<[^>]+>/g, "").trim()))
        .filter((row) => row.length > 0);
      return { headers, rows };
    });
  }

  public extractTextBlocks(html: string): string[] {
    const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    return withoutScripts
      .replace(/<[^>]+>/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  public extractAll(html: string): ParsedDomContent {
    return {
      textBlocks: this.extractTextBlocks(html),
      links: this.extractLinks(html),
      tables: this.extractTables(html),
    };
  }
}
