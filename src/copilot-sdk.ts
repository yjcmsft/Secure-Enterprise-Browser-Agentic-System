/**
 * GitHub Copilot SDK Integration — registers browser agent skills as custom
 * tools on a Copilot session, enabling Copilot CLI to orchestrate browser
 * automation, SEC EDGAR lookups, Teams messaging, and more.
 *
 * Architecture:
 *   Your Application (this module)
 *        ↓
 *   @github/copilot-sdk (CopilotClient)
 *        ↓ JSON-RPC
 *   Copilot CLI (server mode)
 *        ↓
 *   LLM (GPT-4o / Claude / etc.)
 *
 * The SDK supports BYOK with Azure OpenAI, so we can use the same
 * AZURE_OPENAI_ENDPOINT already configured in .env.
 */

import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z, type ZodSchema } from "zod";
import { createLogger, format, transports } from "winston";
import { ToolRouter } from "./orchestrator/tool-router.js";
import { config } from "./config.js";
import type { SkillExecutionContext } from "./types/skills.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const toolRouter = new ToolRouter();

// ---------------------------------------------------------------------------
// Copilot SDK tool definitions — maps our 12 skills to Copilot custom tools
// ---------------------------------------------------------------------------

function createBrowserTools(context: SkillExecutionContext) {
  // Helper to define a tool with proper type casting for the SDK
  function skill(
    name: string,
    description: string,
    parameters: ZodSchema,
  ) {
    return defineTool(name, {
      description,
      parameters: parameters as unknown as Record<string, unknown>,
      handler: async (params) => {
        const result = await toolRouter.run(name, params as Record<string, unknown>, context);
        return result;
      },
    });
  }

  return [
    skill(
      "navigate_page",
      "Navigate to a URL in the enterprise browser. Supports internal apps and external sites within the URL allowlist.",
      z.object({
        url: z.string().describe("The URL to navigate to"),
        waitFor: z.string().optional().describe("CSS selector to wait for after navigation"),
        clickText: z.string().optional().describe("Text to click after page loads"),
      }),
    ),

    skill(
      "extract_content",
      "Extract structured content from a browser page — text, tables, links, or form values.",
      z.object({
        url: z.string().optional().describe("URL to navigate to before extraction"),
        mode: z
          .enum(["all", "text", "table", "links", "form_values"])
          .default("all")
          .describe("Type of content to extract"),
      }),
    ),

    skill(
      "fill_form",
      "Fill form fields on the current browser page. Requires user approval.",
      z.object({
        url: z.string().optional().describe("URL to navigate to before filling"),
        fields: z.record(z.string()).describe("Map of field name/ID to value"),
      }),
    ),

    skill(
      "submit_action",
      "Submit a form or trigger an action on the current browser page. Requires user approval.",
      z.object({
        url: z.string().optional().describe("URL for API-path submission"),
        selector: z.string().optional().describe("CSS selector for the submit button"),
        payload: z.record(z.unknown()).optional().describe("Optional payload for API-path"),
      }),
    ),

    skill(
      "discover_apis",
      "Discover REST/GraphQL API endpoints for a target application by probing for OpenAPI/Swagger specs.",
      z.object({
        baseUrl: z.string().describe("Base URL of the target application"),
      }),
    ),

    skill(
      "capture_screenshot",
      "Capture a screenshot of the current browser page or a specific element.",
      z.object({
        url: z.string().optional().describe("URL to navigate to before capturing"),
        selector: z.string().optional().describe("CSS selector to screenshot a specific element"),
      }),
    ),

    skill(
      "compare_data",
      "Compare data from multiple URLs. Automatically uses SEC EDGAR XBRL API when SEC pages are detected.",
      z.object({
        urls: z.array(z.string()).describe("List of URLs to compare"),
        mode: z
          .enum(["all", "text", "table", "links"])
          .default("all")
          .describe("Extraction mode for each URL"),
      }),
    ),

    skill(
      "send_teams_message",
      "Send a message to a Microsoft Teams chat or channel via Microsoft Graph.",
      z.object({
        chatId: z.string().optional().describe("Teams chat ID for direct messages"),
        teamId: z.string().optional().describe("Teams team ID for channel messages"),
        channelId: z.string().optional().describe("Teams channel ID"),
        content: z.string().describe("Message content (HTML supported)"),
      }),
    ),

    skill(
      "manage_calendar",
      "Create, list, or update calendar events via Microsoft Graph.",
      z.object({
        action: z.enum(["list", "create", "update"]).describe("Calendar action to perform"),
        subject: z.string().optional().describe("Event subject/title"),
        start: z.string().optional().describe("Start time (ISO 8601)"),
        end: z.string().optional().describe("End time (ISO 8601)"),
        eventId: z.string().optional().describe("Event ID for updates"),
      }),
    ),

    skill(
      "create_adaptive_card",
      "Build an Adaptive Card v1.5 JSON structure for Teams messages.",
      z.object({
        title: z.string().describe("Card title"),
        body: z.string().describe("Card body content"),
      }),
    ),

    skill(
      "analyze_work_patterns",
      "Analyze work patterns from Microsoft Graph calendar data — meeting count, focus time, collaboration velocity.",
      z.object({
        startDate: z.string().optional().describe("Analysis start date (ISO 8601)"),
        endDate: z.string().optional().describe("Analysis end date (ISO 8601)"),
      }),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Copilot SDK client lifecycle
// ---------------------------------------------------------------------------

let copilotClient: CopilotClient | null = null;

/**
 * Start a Copilot SDK client and create a session with browser agent tools.
 *
 * Supports two modes:
 * 1. **BYOK (Azure OpenAI)** — uses your existing Azure OpenAI deployment
 * 2. **GitHub Copilot** — uses Copilot's built-in models (requires Copilot subscription)
 */
export async function startCopilotSession(
  userId: string,
  sessionId: string,
  prompt: string,
): Promise<{
  response: string;
  events: Array<{ type: string; data?: unknown }>;
}> {
  const context: SkillExecutionContext = { userId, sessionId };
  const tools = createBrowserTools(context);
  const events: Array<{ type: string; data?: unknown }> = [];

  // Create client if not already running
  if (!copilotClient) {
    copilotClient = new CopilotClient({
      githubToken: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
      logLevel: "warning",
    });
    await copilotClient.start();
    logger.info("copilot-sdk-started");
  }

  // Build session config
  const sessionConfig = {
    sessionId: `browser-agent-${sessionId}`,
    model: config.AZURE_OPENAI_MODEL ?? "gpt-4o",
    tools,
    onPermissionRequest: async () => ({ kind: "approved" as const }),
    systemMessage: {
      content: `You are a secure enterprise browser automation agent with 12 skills.
Use the provided tools to navigate web pages, extract content, compare data,
fill forms, submit actions, and communicate via Microsoft Teams.
When comparing SEC filings (AAPL, MSFT, etc.), use compare_data — it automatically
falls back to the SEC EDGAR XBRL API when bot-detection is encountered.
Always explain what you're doing before invoking tools.`,
    },
  } as Parameters<CopilotClient["createSession"]>[0];

  // Use Azure OpenAI as custom provider if configured (BYOK)
  if (config.AZURE_OPENAI_ENDPOINT) {
    sessionConfig.provider = {
      type: "azure",
      baseUrl: config.AZURE_OPENAI_ENDPOINT.replace(/\/$/, ""),
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      azure: { apiVersion: "2024-10-21" },
    };
  }

  const session = await copilotClient.createSession(sessionConfig);

  // Collect events
  session.on((event) => {
    events.push({ type: event.type, data: "data" in event ? event.data : undefined });
  });

  // Send prompt and wait for response
  const result = await session.sendAndWait({ prompt }, 120_000);
  const response = (result as { data?: { content?: string } })?.data?.content ?? "No response received.";

  // Disconnect session if the method exists (SDK version dependent)
  try {
    const s = session as unknown as { disconnect?: () => Promise<void> };
    if (typeof s.disconnect === "function") await s.disconnect();
  } catch { /* session cleanup is best-effort */ }

  logger.info("copilot-sdk-session-complete", {
    sessionId,
    events: events.length,
    responseLength: response.length,
  });

  return { response, events };
}

/**
 * Stop the Copilot SDK client.
 */
export async function stopCopilotClient(): Promise<void> {
  if (copilotClient) {
    await copilotClient.stop();
    copilotClient = null;
    logger.info("copilot-sdk-stopped");
  }
}
