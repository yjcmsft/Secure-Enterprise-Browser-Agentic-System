/**
 * Copilot SDK integration — registers browser agent skills as Copilot tools.
 *
 * This module creates a CopilotClient, defines each skill as a typed tool
 * using raw JSON schemas (compatible with Zod v3), and exposes lifecycle
 * helpers `startCopilotAgent` / `createAgentSession` / `stopCopilotAgent`.
 *
 * Architecture:
 *   Your Application (this module)
 *        ↓
 *   @github/copilot-sdk (CopilotClient)
 *        ↓ JSON-RPC
 *   Copilot CLI (server mode)
 */

import { CopilotClient, CopilotSession, approveAll } from "@github/copilot-sdk";
import type { Tool, ToolInvocation } from "@github/copilot-sdk";
import { createLogger, format, transports } from "winston";
import { ToolRouter } from "./orchestrator/tool-router.js";
import type { SkillExecutionContext } from "./types/skills.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const toolRouter = new ToolRouter();

// ---------------------------------------------------------------------------
// Tool context helper — builds a SkillExecutionContext from session metadata
// ---------------------------------------------------------------------------
function buildContext(invocation?: ToolInvocation): SkillExecutionContext {
  return {
    userId: "copilot-user",
    sessionId: invocation?.sessionId ?? `copilot-${Date.now()}`,
  };
}

// ---------------------------------------------------------------------------
// Tool definitions — raw JSON schemas for Zod v3 compatibility
// ---------------------------------------------------------------------------

const navigatePageTool: Tool = {
  name: "navigate_page",
  description:
    "Navigate to a URL in the enterprise browser. Supports internal apps (ServiceNow, Jira, Workday) and external sites within the URL allowlist.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "The URL to navigate to" },
      waitFor: { type: "string", description: "CSS selector to wait for after navigation" },
      clickText: { type: "string", description: "Text to click after page loads" },
    },
    required: ["url"],
  },
  handler: async (args: unknown, invocation: ToolInvocation) => {
    const { url, waitFor, clickText } = args as Record<string, unknown>;
    return toolRouter.run("navigate_page", { url, waitFor, clickText }, buildContext(invocation));
  },
};

const extractContentTool: Tool = {
  name: "extract_content",
  description:
    "Extract structured content from the current browser page — text, tables, links, or form values.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to navigate to before extraction" },
      mode: {
        type: "string",
        enum: ["all", "text", "table", "links", "form_values"],
        default: "all",
        description: "Type of content to extract",
      },
    },
  },
  handler: async (args: unknown, invocation: ToolInvocation) => {
    const { url, mode } = args as Record<string, unknown>;
    return toolRouter.run("extract_content", { url, mode: mode ?? "all" }, buildContext(invocation));
  },
};

const fillFormTool: Tool = {
  name: "fill_form",
  description:
    "Fill form fields on the current browser page. Requires user approval before execution.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to navigate to before filling" },
      fields: {
        type: "object",
        additionalProperties: { oneOf: [{ type: "string" }, { type: "boolean" }] },
        description: "Map of field name/ID to value",
      },
    },
    required: ["fields"],
  },
  handler: async (args: unknown, invocation: ToolInvocation) => {
    const { url, fields } = args as Record<string, unknown>;
    return toolRouter.run("fill_form", { url, fields }, buildContext(invocation));
  },
};

const submitActionTool: Tool = {
  name: "submit_action",
  description:
    "Submit a form or trigger an action on the current browser page. Requires user approval.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL for API-path submission" },
      selector: {
        type: "string",
        default: "button[type='submit']",
        description: "CSS selector for the submit button",
      },
      payload: { type: "object", description: "Optional payload for API-path" },
    },
  },
  handler: async (args: unknown, invocation: ToolInvocation) => {
    const { url, selector, payload } = args as Record<string, unknown>;
    return toolRouter.run(
      "submit_action",
      { url, selector: selector ?? "button[type='submit']", payload },
      buildContext(invocation),
    );
  },
};

const discoverApisTool: Tool = {
  name: "discover_apis",
  description:
    "Discover available REST/GraphQL API endpoints for a target application by probing for OpenAPI/Swagger specs.",
  parameters: {
    type: "object",
    properties: {
      baseUrl: { type: "string", description: "Base URL of the target application" },
    },
    required: ["baseUrl"],
  },
  handler: async (args: unknown, invocation: ToolInvocation) => {
    const { baseUrl } = args as Record<string, unknown>;
    return toolRouter.run("discover_apis", { baseUrl }, buildContext(invocation));
  },
};

const captureScreenshotTool: Tool = {
  name: "capture_screenshot",
  description:
    "Capture a screenshot of the current browser page or a specific element.",
  parameters: {
    type: "object",
    properties: {
      selector: { type: "string", description: "CSS selector to screenshot a specific element" },
    },
  },
  handler: async (args: unknown, invocation: ToolInvocation) => {
    const { selector } = args as Record<string, unknown>;
    return toolRouter.run("capture_screenshot", { selector }, buildContext(invocation));
  },
};

const compareDataTool: Tool = {
  name: "compare_data",
  description:
    "Compare data from multiple URLs by navigating to each, extracting content, and compiling a comparison.",
  parameters: {
    type: "object",
    properties: {
      urls: {
        type: "array",
        items: { type: "string" },
        description: "List of URLs to compare",
      },
      mode: {
        type: "string",
        enum: ["all", "text", "table", "links"],
        default: "all",
        description: "Extraction mode for each URL",
      },
    },
    required: ["urls"],
  },
  handler: async (args: unknown, invocation: ToolInvocation) => {
    const { urls, mode } = args as Record<string, unknown>;
    return toolRouter.run("compare_data", { urls, mode: mode ?? "all" }, buildContext(invocation));
  },
};

const orchestrateWorkflowTool: Tool = {
  name: "orchestrate_workflow",
  description:
    "Execute a multi-step workflow across multiple skills. Steps run sequentially with results from the previous step available via {{lastResult}}.",
  parameters: {
    type: "object",
    properties: {
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            skill: { type: "string", description: "Skill name to invoke" },
            params: { type: "object", description: "Parameters for the skill" },
          },
          required: ["skill", "params"],
        },
        description: "Ordered list of workflow steps",
      },
    },
    required: ["steps"],
  },
  handler: async (args: unknown, invocation: ToolInvocation) => {
    const { steps } = args as Record<string, unknown>;
    return toolRouter.run("orchestrate_workflow", { steps }, buildContext(invocation));
  },
};

// ---------------------------------------------------------------------------
// All tools for session registration
// ---------------------------------------------------------------------------
export const browserAgentTools: Tool[] = [
  navigatePageTool,
  extractContentTool,
  fillFormTool,
  submitActionTool,
  discoverApisTool,
  captureScreenshotTool,
  compareDataTool,
  orchestrateWorkflowTool,
];

// ---------------------------------------------------------------------------
// Agent lifecycle
// ---------------------------------------------------------------------------
let client: CopilotClient | null = null;

export async function startCopilotAgent(): Promise<CopilotClient> {
  client = new CopilotClient({
    logLevel: "info",
  });

  await client.start();
  logger.info("copilot-agent-started", { tools: browserAgentTools.length });

  return client;
}

export async function createAgentSession(
  copilotClient: CopilotClient,
  options?: { model?: string; sessionId?: string },
): Promise<CopilotSession> {
  const session = await copilotClient.createSession({
    sessionId: options?.sessionId,
    model: options?.model ?? "gpt-4o",
    tools: browserAgentTools,
    onPermissionRequest: approveAll,
    systemMessage: {
      content: `You are a Secure Enterprise Browser Agent. You help users interact with internal web applications (ServiceNow, Jira, Workday, Grafana) and external sites (investor relations, SEC filings, travel portals).

Security rules:
- Always check the URL allowlist before navigating
- Use native REST/GraphQL APIs when available, fall back to DOM scraping
- Request user approval before any write/submit action
- Never expose auth tokens in responses

Workflow rules:
- For multi-step tasks, use orchestrate_workflow
- When comparing data across sources, use compare_data
- Always extract_content after navigate_page to read page data`,
    },
  });

  logger.info("copilot-session-created", {
    sessionId: session.sessionId,
    model: options?.model ?? "gpt-4o",
  });

  return session;
}

export async function stopCopilotAgent(): Promise<void> {
  if (client) {
    await client.stop();
    client = null;
    logger.info("copilot-agent-stopped");
  }
}
