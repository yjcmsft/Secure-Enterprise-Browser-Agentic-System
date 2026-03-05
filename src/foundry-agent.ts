/**
 * Azure AI Foundry Agent Service integration — registers browser agent skills
 * as function tools on an Azure AI Agent, manages threads and runs.
 *
 * Architecture:
 *   Your Application (this module)
 *        ↓
 *   @azure/ai-projects (AIProjectClient)
 *        ↓ REST
 *   Azure AI Foundry Agent Service
 */

import { AIProjectClient } from "@azure/ai-projects";
import type { FunctionToolDefinition } from "@azure/ai-agents";
import { DefaultAzureCredential } from "@azure/identity";
import { createLogger, format, transports } from "winston";
import { config } from "./config.js";
import { ToolRouter } from "./orchestrator/tool-router.js";
import type { SkillExecutionContext } from "./types/skills.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const toolRouter = new ToolRouter();

// ---------------------------------------------------------------------------
// Function tool definitions for Azure AI Foundry Agent Service
// ---------------------------------------------------------------------------

export const functionTools: FunctionToolDefinition[] = [
  {
    type: "function",
    function: {
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
    },
  },
  {
    type: "function",
    function: {
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
            description: "Type of content to extract",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fill_form",
      description:
        "Fill form fields on the current browser page. Requires user approval before execution.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to navigate to before filling" },
          fields: {
            type: "object",
            description: "Map of field name/ID to value",
          },
        },
        required: ["fields"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_action",
      description:
        "Submit a form or trigger an action on the current browser page. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL for API-path submission" },
          selector: {
            type: "string",
            description: "CSS selector for the submit button",
          },
          payload: { type: "object", description: "Optional payload for API-path" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
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
    },
  },
  {
    type: "function",
    function: {
      name: "capture_screenshot",
      description: "Capture a screenshot of the current browser page or a specific element.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector to screenshot a specific element" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
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
            description: "Extraction mode for each URL",
          },
        },
        required: ["urls"],
      },
    },
  },
  {
    type: "function",
    function: {
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
    },
  },
  {
    type: "function",
    function: {
      name: "send_teams_message",
      description:
        "Send a message to a Microsoft Teams chat or channel via Microsoft Graph.",
      parameters: {
        type: "object",
        properties: {
          chatId: { type: "string", description: "Teams chat ID for direct messages" },
          teamId: { type: "string", description: "Teams team ID for channel messages" },
          channelId: { type: "string", description: "Teams channel ID" },
          content: { type: "string", description: "Message content (HTML supported)" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_calendar",
      description:
        "List, create, or update calendar events via Microsoft Graph.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["list", "create", "update"],
            description: "Calendar action to perform",
          },
          subject: { type: "string", description: "Event subject" },
          start: { type: "string", description: "Start datetime (ISO 8601)" },
          end: { type: "string", description: "End datetime (ISO 8601)" },
          eventId: { type: "string", description: "Event ID for updates" },
          attendees: {
            type: "array",
            items: { type: "string" },
            description: "Email addresses of attendees",
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_adaptive_card",
      description:
        "Build and send an Adaptive Card to a Teams chat or channel.",
      parameters: {
        type: "object",
        properties: {
          chatId: { type: "string", description: "Teams chat ID" },
          teamId: { type: "string", description: "Teams team ID" },
          channelId: { type: "string", description: "Teams channel ID" },
          title: { type: "string", description: "Card title" },
          body: { type: "string", description: "Card body text" },
          actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
              },
            },
            description: "Action buttons",
          },
        },
        required: ["title", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_work_patterns",
      description:
        "Analyze productivity and work patterns for a user via Microsoft Graph and Work IQ metrics.",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string", description: "User ID to analyze" },
          period: {
            type: "string",
            enum: ["day", "week", "month"],
            description: "Analysis period",
          },
        },
        required: ["userId"],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// System instructions for the Foundry agent
// ---------------------------------------------------------------------------

export const AGENT_INSTRUCTIONS = `You are a Secure Enterprise Browser Agent powered by Azure AI Foundry.
You help users interact with internal web applications (ServiceNow, Jira, Workday, Grafana) and external sites (investor relations, SEC filings, travel portals).

Security rules:
- Always check the URL allowlist before navigating
- Use native REST/GraphQL APIs when available, fall back to DOM scraping
- Request user approval before any write/submit action
- Never expose auth tokens in responses

Workflow rules:
- For multi-step tasks, use orchestrate_workflow
- When comparing data across sources, use compare_data
- Always extract_content after navigate_page to read page data`;

// ---------------------------------------------------------------------------
// Agent lifecycle — Azure AI Foundry Agent Service
// ---------------------------------------------------------------------------

let projectClient: AIProjectClient | null = null;
let agentId: string | null = null;

/**
 * Initialize the Azure AI Foundry project client and create a persistent agent.
 */
export async function startFoundryAgent(): Promise<{ client: AIProjectClient; agentId: string }> {
  const endpoint = config.AZURE_AI_PROJECT_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      "AZURE_AI_PROJECT_ENDPOINT is required. Set it to your Azure AI Foundry project endpoint.",
    );
  }

  projectClient = new AIProjectClient(endpoint, new DefaultAzureCredential());

  const agent = await projectClient.agents.createAgent(config.AZURE_OPENAI_MODEL, {
    name: "secure-browser-agent",
    instructions: AGENT_INSTRUCTIONS,
    tools: functionTools,
  });

  agentId = agent.id;
  logger.info("foundry-agent-created", { agentId: agent.id, model: config.AZURE_OPENAI_MODEL });

  return { client: projectClient, agentId: agent.id };
}

/**
 * Create a new conversation thread.
 */
export async function createThread(): Promise<string> {
  if (!projectClient) throw new Error("Foundry agent not started. Call startFoundryAgent() first.");
  const thread = await projectClient.agents.threads.create();
  logger.info("thread-created", { threadId: thread.id });
  return thread.id;
}

/**
 * Execute a tool call from the agent and return the result as a string.
 */
export async function executeToolCall(
  functionName: string,
  args: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<string> {
  const result = await toolRouter.run(functionName, args, context);
  return JSON.stringify(result);
}

/**
 * Retrieve the current project client and agent ID.
 */
export function getFoundryAgent(): { client: AIProjectClient; agentId: string } | null {
  if (!projectClient || !agentId) return null;
  return { client: projectClient, agentId };
}

/**
 * Clean up the Foundry agent.
 */
export async function stopFoundryAgent(): Promise<void> {
  if (projectClient && agentId) {
    try {
      await projectClient.agents.deleteAgent(agentId);
      logger.info("foundry-agent-deleted", { agentId });
    } catch (err) {
      logger.warn("foundry-agent-cleanup-error", { error: (err as Error).message });
    }
    agentId = null;
    projectClient = null;
  }
}
