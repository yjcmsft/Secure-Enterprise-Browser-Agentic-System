/**
 * Demo: Web Scraping & Summarizing with Secure Enterprise Browser Agent
 *
 * This script demonstrates the agent's core capabilities:
 *   1. DOM parsing — extracting text, links, and tables from HTML
 *   2. Content safety — redacting PII from extracted content
 *   3. Task planning — decomposing prompts into skill invocations
 *   4. Workflow orchestration — chaining multiple skills together
 *
 * Run:  node --loader tsx scripts/demo-scraping.ts
 */

import { DomParser } from "../src/browser/dom-parser.js";
import { ContentSafetyGuard } from "../src/security/content-safety.js";
import { TaskPlanner } from "../src/orchestrator/task-planner.js";
import { ResponseNormalizer } from "../src/api/response-normalizer.js";

// ── Helpers ──────────────────────────────────────────────────────────────

function header(title: string): void {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}\n`);
}

function section(title: string): void {
  console.log(`\n  ── ${title} ${"─".repeat(50 - title.length)}\n`);
}

// ── Demo Data ────────────────────────────────────────────────────────────

const SAMPLE_PAGES = {
  microsoftIR: `
    <html>
      <head><title>Microsoft FY2025 Annual Report</title></head>
      <body>
        <h1>Microsoft Corporation — Annual Report FY2025</h1>
        <p>Total Revenue: $245.1 billion (up 16% year-over-year)</p>
        <p>Operating Income: $112.3 billion</p>
        <p>Net Income: $88.1 billion</p>
        <h2>Segment Performance</h2>
        <table>
          <tr><th>Segment</th><th>Revenue</th><th>Growth</th></tr>
          <tr><td>Intelligent Cloud</td><td>$105.4B</td><td>+22%</td></tr>
          <tr><td>Productivity & Business</td><td>$82.1B</td><td>+14%</td></tr>
          <tr><td>More Personal Computing</td><td>$57.6B</td><td>+9%</td></tr>
        </table>
        <h2>Key Highlights</h2>
        <ul>
          <li>Azure revenue grew 29% year-over-year</li>
          <li>Microsoft 365 commercial seats surpassed 400 million</li>
          <li>GitHub Copilot reached 1.8 million paid subscribers</li>
        </ul>
        <a href="https://microsoft.com/investor/sec-filings">SEC Filings</a>
        <a href="https://microsoft.com/investor/earnings">Quarterly Earnings</a>
        <p>Contact: John Smith (john.smith@microsoft.com) | +1 (425) 882-8080</p>
        <script>window.analytics.track('pageview');</script>
      </body>
    </html>
  `,

  servicenowIncident: `
    <html>
      <head><title>ServiceNow — Incident INC0042</title></head>
      <body>
        <h1>Incident: INC0042</h1>
        <table>
          <tr><th>Field</th><th>Value</th></tr>
          <tr><td>Status</td><td>In Progress</td></tr>
          <tr><td>Priority</td><td>P2 — High</td></tr>
          <tr><td>Assigned To</td><td>Alice Johnson (alice@contoso.com)</td></tr>
          <tr><td>Short Description</td><td>Production API latency spike</td></tr>
          <tr><td>Category</td><td>Infrastructure</td></tr>
          <tr><td>Created</td><td>2025-03-01 09:15:00</td></tr>
        </table>
        <h2>Work Notes</h2>
        <p>Investigated root cause — identified memory leak in auth service.</p>
        <p>Patch deployed to staging. Awaiting approval for production rollout.</p>
        <a href="https://contoso.service-now.com/kb/KB0001234">Related KB Article</a>
      </body>
    </html>
  `,

  secFiling: `
    <html>
      <head><title>SEC Filing — 10-K Annual Report</title></head>
      <body>
        <h1>Form 10-K Annual Report — FY2025</h1>
        <h2>Risk Factors</h2>
        <p>Artificial Intelligence competition continues to intensify across cloud providers.</p>
        <p>Regulatory changes in the United States and European Union may impact operations.</p>
        <h2>Financial Statements</h2>
        <table>
          <tr><th>Line Item</th><th>FY2025</th><th>FY2024</th><th>Change</th></tr>
          <tr><td>Revenue</td><td>$245.1B</td><td>$211.9B</td><td>+15.7%</td></tr>
          <tr><td>Cost of Revenue</td><td>$81.2B</td><td>$74.1B</td><td>+9.6%</td></tr>
          <tr><td>Gross Profit</td><td>$163.9B</td><td>$137.8B</td><td>+18.9%</td></tr>
          <tr><td>Operating Expenses</td><td>$51.6B</td><td>$47.3B</td><td>+9.1%</td></tr>
          <tr><td>Operating Income</td><td>$112.3B</td><td>$90.5B</td><td>+24.1%</td></tr>
        </table>
        <p>Filed by: Jane Doe (jdoe@sec.gov) | Phone: +1 (202) 551-8090</p>
      </body>
    </html>
  `,
};

// ── Demo Functions ───────────────────────────────────────────────────────

async function demoWebScraping(): Promise<void> {
  header("DEMO 1: Web Scraping — DOM Content Extraction");

  const parser = new DomParser();

  for (const [pageName, html] of Object.entries(SAMPLE_PAGES)) {
    section(`Scraping: ${pageName}`);

    const content = parser.extractAll(html);

    console.log(`  📄 Text blocks extracted: ${content.textBlocks.length}`);
    for (const text of content.textBlocks.slice(0, 5)) {
      console.log(`     • ${text}`);
    }
    if (content.textBlocks.length > 5) {
      console.log(`     ... and ${content.textBlocks.length - 5} more`);
    }

    console.log(`\n  🔗 Links found: ${content.links.length}`);
    for (const link of content.links) {
      console.log(`     • [${link.text}] → ${link.href}`);
    }

    console.log(`\n  📊 Tables found: ${content.tables.length}`);
    for (const table of content.tables) {
      console.log(`     Headers: ${table.headers.join(" | ")}`);
      for (const row of table.rows.slice(0, 4)) {
        console.log(`     ${row.join(" | ")}`);
      }
    }
  }
}

async function demoContentSafety(): Promise<void> {
  header("DEMO 2: Content Safety — PII Redaction & Screening");

  const guard = new ContentSafetyGuard();
  const parser = new DomParser();

  const scenarios = [
    {
      name: "Microsoft IR page (contains PII: email, phone, names)",
      html: SAMPLE_PAGES.microsoftIR,
    },
    {
      name: "SEC Filing (contains PII: email, phone, person names)",
      html: SAMPLE_PAGES.secFiling,
    },
    {
      name: "ServiceNow Incident (contains employee email)",
      html: SAMPLE_PAGES.servicenowIncident,
    },
  ];

  for (const { name, html } of scenarios) {
    section(name);

    const content = parser.extractAll(html);
    const rawText = content.textBlocks.join(" ");

    // Screen input
    const inputResult = await guard.screenInput(rawText);
    console.log(`  🛡️  Input screening: ${inputResult.allowed ? "✅ ALLOWED" : "🚫 BLOCKED"}`);
    if (!inputResult.allowed) {
      console.log(`     Blocked categories: ${inputResult.blockedCategories.join(", ")}`);
    }

    // Screen output with PII redaction
    const outputResult = await guard.screenOutput(rawText);
    console.log(`  🔒 Output screening: ${outputResult.allowed ? "✅ ALLOWED" : "🚫 BLOCKED"}`);
    if (outputResult.redactedText) {
      console.log(`  📝 Redacted output (first 300 chars):`);
      console.log(`     ${outputResult.redactedText.slice(0, 300)}...`);
    }
  }

  // Test with sensitive data
  section("Sensitive Data Detection");

  const sensitiveInputs = [
    "My SSN is 123-45-6789",
    "Card: 4111 1111 1111 1111",
    "Safe text: quarterly report is ready",
  ];

  for (const input of sensitiveInputs) {
    const result = await guard.screenInput(input);
    const status = result.allowed ? "✅ ALLOWED" : "🚫 BLOCKED";
    console.log(`  ${status}  "${input}"`);
    if (!result.allowed) {
      console.log(`          Reason: ${result.blockedCategories.join(", ")}`);
    }
  }
}

async function demoTaskPlanning(): Promise<void> {
  header("DEMO 3: Task Planning — Prompt Decomposition");

  const planner = new TaskPlanner();

  const prompts = [
    "Navigate to https://microsoft.com/investor and extract the financial tables",
    "Fill the incident form and submit it with a status update",
    "Compare pricing data from SEC filings across three competitors",
    "Send a Teams notification about the quarterly earnings and schedule a review meeting",
    "Open the ServiceNow dashboard, extract incident metrics, then capture a screenshot",
    "Discover available APIs on the HR portal",
  ];

  for (const prompt of prompts) {
    section(`Prompt: "${prompt}"`);

    const plan = await planner.createPlan(prompt);
    console.log(`  📋 Plan: ${plan.steps.length} step(s)`);
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i]!;
      const params = JSON.stringify(step.params);
      console.log(`     ${i + 1}. ${step.skill}  ${params.length > 60 ? params.slice(0, 60) + "..." : params}`);
    }
  }
}

async function demoResponseNormalization(): Promise<void> {
  header("DEMO 4: API Response Normalization");

  const normalizer = new ResponseNormalizer();
  const parser = new DomParser();

  section("Normalizing scraped data into structured API responses");

  // Simulate scraping and normalizing
  const content = parser.extractAll(SAMPLE_PAGES.microsoftIR);

  const textResponse = normalizer.normalize(200, content.textBlocks.join("\n"));
  console.log(`  📄 Text response (status ${textResponse.status}):`);
  console.log(`     Keys: ${Object.keys(textResponse.data).join(", ")}`);

  const tableResponse = normalizer.normalize(200, content.tables);
  console.log(`\n  📊 Table response (status ${tableResponse.status}):`);
  console.log(`     Type: ${Array.isArray(tableResponse.data) ? "array" : "object"}`);
  if (Array.isArray(tableResponse.data)) {
    console.log(`     Items: ${tableResponse.data.length}`);
  }

  const linkResponse = normalizer.normalize(200, content.links);
  console.log(`\n  🔗 Link response (status ${linkResponse.status}):`);
  if (Array.isArray(linkResponse.data)) {
    for (const link of linkResponse.data as Array<Record<string, unknown>>) {
      console.log(`     • ${link.text} → ${link.href}`);
    }
  }

  // Simulate error response
  const errorResponse = normalizer.normalize(404, null);
  console.log(`\n  ❌ Error response (status ${errorResponse.status}):`);
  console.log(`     Data: ${JSON.stringify(errorResponse.data)}`);
}

async function demoEndToEnd(): Promise<void> {
  header("DEMO 5: End-to-End — Scrape, Redact, and Summarize");

  const parser = new DomParser();
  const guard = new ContentSafetyGuard();
  const normalizer = new ResponseNormalizer();
  const planner = new TaskPlanner();

  section("Scenario: Extract & summarize Microsoft FY2025 Annual Report");

  // Step 1: Plan
  const plan = await planner.createPlan(
    "Navigate to Microsoft investor page and extract financial summary tables",
  );
  console.log(`  📋 Generated plan with ${plan.steps.length} steps:`);
  for (const step of plan.steps) {
    console.log(`     → ${step.skill}`);
  }

  // Step 2: Scrape (simulated — using sample HTML)
  console.log(`\n  🌐 Scraping page content...`);
  const content = parser.extractAll(SAMPLE_PAGES.microsoftIR);
  console.log(`     ✅ Extracted ${content.textBlocks.length} text blocks, ${content.tables.length} table(s), ${content.links.length} link(s)`);

  // Step 3: Content safety screening
  console.log(`\n  🛡️  Running content safety checks...`);
  const fullText = content.textBlocks.join(" ");
  const safetyResult = await guard.screenOutput(fullText);
  console.log(`     Input clear: ${safetyResult.allowed ? "✅" : "🚫"}`);

  // Step 4: PII redaction
  console.log(`\n  🔒 Redacting PII from output...`);
  const redacted = safetyResult.redactedText ?? fullText;
  const piiFound = redacted.includes("[REDACTED]");
  console.log(`     PII detected and redacted: ${piiFound ? "Yes ✅" : "None found"}`);

  // Step 5: Normalize response
  console.log(`\n  📦 Normalizing to structured API response...`);
  const response = normalizer.normalize(200, {
    title: content.textBlocks[0] ?? "Untitled",
    summary: redacted.slice(0, 200),
    tables: content.tables,
    links: content.links,
    scrapedAt: new Date().toISOString(),
  });
  console.log(`     Status: ${response.status}`);
  const data = response.data as Record<string, unknown>;
  console.log(`     Title: ${data.title}`);
  console.log(`     Summary: ${(data.summary as string).slice(0, 120)}...`);

  // Step 6: Print financial table
  section("Extracted Financial Data");
  for (const table of content.tables) {
    if (table.headers.length > 0) {
      const colWidths = table.headers.map((h) => Math.max(h.length, 20));
      const headerLine = table.headers.map((h, i) => h.padEnd(colWidths[i]!)).join(" | ");
      console.log(`  ${headerLine}`);
      console.log(`  ${"─".repeat(headerLine.length)}`);
      for (const row of table.rows) {
        if (row.length === table.headers.length) {
          const rowLine = row.map((cell, i) => cell.padEnd(colWidths[i]!)).join(" | ");
          console.log(`  ${rowLine}`);
        }
      }
    }
  }

  console.log(`\n  ✅ Demo complete! Data was scraped, screened, redacted, and normalized.`);
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n🚀 Secure Enterprise Browser Agent — Web Scraping & Summarizing Demo\n");
  console.log("This demo showcases the agent's offline capabilities without requiring");
  console.log("Azure services. All processing happens locally using sample HTML pages.\n");

  await demoWebScraping();
  await demoContentSafety();
  await demoTaskPlanning();
  await demoResponseNormalization();
  await demoEndToEnd();

  header("ALL DEMOS COMPLETE");
  console.log("  The Secure Enterprise Browser Agent can:");
  console.log("  • Scrape and parse web content (text, tables, links)");
  console.log("  • Screen content for safety violations");
  console.log("  • Redact PII (emails, phones, names) from output");
  console.log("  • Plan multi-step workflows from natural language");
  console.log("  • Normalize responses into structured API formats");
  console.log("  • Chain skills together for complex workflows\n");
}

main().catch(console.error);
