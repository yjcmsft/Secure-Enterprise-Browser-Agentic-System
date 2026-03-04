/**
 * AG-UI streaming handler — bridges Azure AI Foundry Agent runs to the AG-UI
 * protocol for CopilotKit frontend integration.
 *
 * Emits Server-Sent Events (SSE) following the AG-UI event schema so any
 * AG-UI compatible frontend (CopilotKit, custom React) can consume streaming
 * agent output with tool call progress, state updates, and message tokens.
 *
 * Architecture:
 *   CopilotKit React UI
 *        ↑ SSE (AG-UI events)
 *   Express SSE endpoint (this module)
 *        ↓
 *   Azure AI Foundry Agent Service (thread runs + function calling)
 */

import { EventType } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type {
  MessageTextContent,
  RequiredFunctionToolCall,
  SubmitToolOutputsAction,
  ThreadMessage,
  ThreadRun,
} from "@azure/ai-agents";
import { createLogger, format, transports } from "winston";
import { executeToolCall, getFoundryAgent, createThread } from "./foundry-agent.js";
import type { SkillExecutionContext } from "./types/skills.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// ---------------------------------------------------------------------------
// Shared agent state — synchronized with frontend via AG-UI STATE_SNAPSHOT
// ---------------------------------------------------------------------------

interface AgentState {
  currentUrl?: string;
  lastSkill?: string;
  workflowProgress?: number;
  approvalPending?: boolean;
}

const sessionStates = new Map<string, AgentState>();

/**
 * AG-UI SSE streaming endpoint handler.
 *
 * Accepts a POST with { prompt, threadId?, userId?, sessionId?, state? } and
 * streams AG-UI events back as Server-Sent Events.
 */
export async function handleAgUiStream(req: Request, res: Response): Promise<void> {
  const {
    prompt,
    threadId: incomingThreadId,
    userId = "anonymous",
    sessionId = `agui-${Date.now()}`,
    state: clientState,
  } = req.body as {
    prompt: string;
    threadId?: string;
    userId?: string;
    sessionId?: string;
    state?: Record<string, unknown>;
  };

  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const foundry = getFoundryAgent();
  if (!foundry) {
    res.status(503).json({ error: "Foundry agent not started" });
    return;
  }

  // --- SSE setup ---
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const encoder = new EventEncoder();
  const runId = randomUUID();
  const messageId = randomUUID();

  function emit(event: { type: EventType; [key: string]: unknown }): void {
    const encoded = encoder.encode(event as Parameters<EventEncoder["encode"]>[0]);
    res.write(encoded);
  }

  // Merge client state
  if (clientState) {
    const existing = sessionStates.get(sessionId) ?? {};
    sessionStates.set(sessionId, { ...existing, ...clientState } as AgentState);
  }

  try {
    // --- RUN_STARTED ---
    emit({ type: EventType.RUN_STARTED, runId, threadId: incomingThreadId ?? sessionId });

    // Create or reuse thread
    const threadId = incomingThreadId ?? (await createThread());

    // Add user message to thread
    await foundry.client.agents.messages.create(threadId, "user", prompt);

    // --- TEXT_MESSAGE_START ---
    emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" });

    // Create and stream the run
    const run: ThreadRun = await foundry.client.agents.runs.create(threadId, foundry.agentId);
    let currentRun: ThreadRun = run;

    // Poll for completion, processing tool calls along the way
    while (
      currentRun.status === "queued" ||
      currentRun.status === "in_progress" ||
      currentRun.status === "requires_action"
    ) {
      if (currentRun.status === "requires_action") {
        const action = currentRun.requiredAction;
        if (!action || action.type !== "submit_tool_outputs") continue;
        const submitAction = action as SubmitToolOutputsAction;
        const toolCalls = submitAction.submitToolOutputs.toolCalls;
        const fnToolCalls = toolCalls.filter(
          (tc): tc is RequiredFunctionToolCall => tc.type === "function",
        );

        for (const toolCall of fnToolCalls) {
          const toolCallId = randomUUID();
          const fnName = toolCall.function.name;
          let fnArgs: Record<string, unknown> = {};

          try {
            fnArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
          } catch {
            fnArgs = {};
          }

          // --- TOOL_CALL_START ---
          emit({ type: EventType.TOOL_CALL_START, toolCallId, toolCallName: fnName });

          // --- TOOL_CALL_ARGS ---
          emit({
            type: EventType.TOOL_CALL_ARGS,
            toolCallId,
            delta: toolCall.function.arguments,
          });

          // Execute the tool via our skill router
          const context: SkillExecutionContext = {
            userId,
            sessionId,
            requestId: runId,
          };

          const toolResult = await executeToolCall(fnName, fnArgs, context);

          // Update shared state
          const agentState = sessionStates.get(sessionId) ?? {};
          agentState.lastSkill = fnName;
          sessionStates.set(sessionId, agentState);

          // --- TOOL_CALL_END ---
          emit({ type: EventType.TOOL_CALL_END, toolCallId, result: toolResult });

          // --- STATE_SNAPSHOT ---
          emit({
            type: EventType.STATE_SNAPSHOT,
            snapshot: sessionStates.get(sessionId) ?? {},
          });
        }

        // Submit tool outputs back to the agent
        const toolOutputs = await Promise.all(
          fnToolCalls.map(async (tc) => {
            const args = (() => {
              try {
                return JSON.parse(tc.function.arguments) as Record<string, unknown>;
              } catch {
                return {};
              }
            })();
            const output = await executeToolCall(tc.function.name, args, {
              userId,
              sessionId,
              requestId: runId,
            });
            return { toolCallId: tc.id, output };
          }),
        );

        currentRun = await foundry.client.agents.runs.submitToolOutputs(
          threadId,
          currentRun.id,
          toolOutputs,
        ) as ThreadRun;
      } else {
        // Poll with backoff
        await new Promise((r) => setTimeout(r, 500));
        currentRun = await foundry.client.agents.runs.get(threadId, currentRun.id);
      }
    }

    // Retrieve the assistant's final messages
    const assistantMessages: ThreadMessage[] = [];
    for await (const m of foundry.client.agents.messages.list(threadId)) {
      if (m.role === "assistant" && m.createdAt >= run.createdAt) {
        assistantMessages.push(m);
      }
    }

    // Stream the response text as chunks
    for (const msg of assistantMessages) {
      for (const content of msg.content) {
        if (content.type === "text") {
          const textContent = content as MessageTextContent;
          emit({
            type: EventType.TEXT_MESSAGE_CONTENT,
            messageId,
            delta: textContent.text.value,
          });
        }
      }
    }

    // --- TEXT_MESSAGE_END ---
    emit({ type: EventType.TEXT_MESSAGE_END, messageId });

    // --- Final STATE_SNAPSHOT ---
    emit({
      type: EventType.STATE_SNAPSHOT,
      snapshot: sessionStates.get(sessionId) ?? {},
    });

    // --- RUN_FINISHED ---
    emit({ type: EventType.RUN_FINISHED, runId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("agui-stream-error", { runId, error: errorMessage });

    emit({
      type: EventType.RUN_ERROR,
      runId,
      message: errorMessage,
    });
  } finally {
    res.end();
  }
}

/**
 * Get the shared state for a session (for external read access).
 */
export function getSessionState(sessionId: string): AgentState | undefined {
  return sessionStates.get(sessionId);
}
