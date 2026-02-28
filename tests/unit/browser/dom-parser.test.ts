import { describe, expect, test } from "vitest";
import { DomParser } from "../../../src/browser/dom-parser.js";

describe("DomParser", () => {
  test("extracts links, tables, and text blocks", () => {
    const parser = new DomParser();
    const html = `
      <html>
        <body>
          <h1>Quarterly Summary</h1>
          <a href="https://example.com/report">Annual Report</a>
          <table>
            <tr><th>Company</th><th>Revenue</th></tr>
            <tr><td>Contoso</td><td>$10B</td></tr>
          </table>
          <script>console.log('ignore');</script>
        </body>
      </html>
    `;

    const all = parser.extractAll(html);

    expect(all.links).toHaveLength(1);
    expect(all.links[0]).toEqual({
      href: "https://example.com/report",
      text: "Annual Report",
    });

    expect(all.tables).toHaveLength(1);
    expect(all.tables[0]?.headers).toEqual(["Company", "Revenue"]);
    expect(all.tables[0]?.rows[1]).toEqual(["Contoso", "$10B"]);

    expect(all.textBlocks).toContain("Quarterly Summary");
    expect(all.textBlocks).toContain("Annual Report");
  });
});
