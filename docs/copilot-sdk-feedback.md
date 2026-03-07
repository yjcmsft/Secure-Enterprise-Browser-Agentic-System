# Copilot SDK Product Feedback

> Filed against [`@github/copilot-sdk@0.1.30`](https://github.com/github/copilot-sdk) (Node.js/TypeScript SDK)
>
> Project: [Secure Enterprise Browser Agentic System](https://github.com/yjcmsft/Secure-Enterprise-Browser-Agentic-System)
>
> Integration: 12 browser-automation skills registered as custom tools via `defineTool()` with Zod schemas, BYOK with Azure OpenAI

---

## Issue 1: Streaming Runs (Highest Impact)

**Current behavior:** After calling `session.send()`, we rely on event handlers for completion detection. In our Azure AI Foundry bridge (`agui-handler.ts`), we poll `getRun()` in a loop adding 500ms–1s latency per cycle:

```typescript
while (currentRun.status === "queued" || currentRun.status === "in_progress") {
  await new Promise((r) => setTimeout(r, 500));
  currentRun = await client.agents.runs.get(threadId, currentRun.id);
}
```

**Desired behavior:** A native SSE/streaming API that eliminates polling:

```typescript
const stream = await client.agents.runs.createStream(threadId, agentId);
for await (const event of stream) { emit(event); }
```

**Impact:** Would eliminate our entire polling loop and reduce the AG-UI bridge from ~40 lines to ~10. This is the single highest-impact improvement for real-time agentic UIs.

---

## Issue 2: Tool Call Batching

**Current behavior:** When the agent calls 3 tools in parallel, we execute them individually and submit outputs in one batch. The SDK handles this well, but the execution loop requires manual orchestration:

```typescript
for (const toolCall of toolCalls) {
  const result = await executeToolCall(toolCall.function.name, args);
  toolOutputs.push({ toolCallId: toolCall.id, output: result });
}
await client.agents.runs.submitToolOutputs(threadId, run.id, toolOutputs);
```

**Desired behavior:** A batch execution helper that parallelizes tool calls automatically and submits outputs in one round-trip.

**Impact:** Would reduce round-trips for multi-tool invocations and simplify the execution loop.

---

## Issue 3: AG-UI STATE_DELTA Support

**Current behavior:** `STATE_SNAPSHOT` sends the full agent state on every update. Our agent tracks `currentUrl`, `lastSkill`, `workflowProgress`, `approvalPending` — each change sends the entire object (~500 bytes):

```typescript
emit({ type: EventType.STATE_SNAPSHOT, snapshot: fullState }); // ~500 bytes every time
```

**Desired behavior:** JSON Patch deltas for incremental state updates:

```typescript
emit({ type: EventType.STATE_DELTA, delta: [
  { op: "replace", path: "/lastSkill", value: "extract_content" }
] }); // ~80 bytes
```

**Impact:** Would cut SSE payload by ~80% for agents with frequently-changing state. Particularly important for long-running workflows with many tool calls.

---

## Issue 4: TypeScript Generics for Tool Results

**Current behavior:** The SDK requires type casts for complex return types:

```typescript
const run = await client.agents.runs.create(threadId, agentId) as unknown as ThreadRun;
```

**Desired behavior:** Generic inference on SDK methods:

```typescript
const run = await client.agents.runs.create<ThreadRun>(threadId, agentId);
```

**Impact:** Better type safety, less boilerplate, fewer runtime errors. TypeScript users (our primary audience) would benefit immediately.

---

## What Works Well

1. **`defineTool()` with Zod schemas** — Registering 12 browser-automation skills as custom tools is clean and type-safe. The Zod → JSON Schema conversion just works.

2. **Session management** — `createSession()` / `disconnect()` lifecycle is intuitive. Multiple sessions with different models work seamlessly.

3. **BYOK with Azure OpenAI** — Configuring `provider: { type: "azure", baseUrl: endpoint }` to use our existing Azure OpenAI deployment was straightforward.

4. **Event model** — `session.on("assistant.message", ...)` / `session.on("tool.execution_start", ...)` maps perfectly to our AG-UI streaming frontend.

5. **`sendAndWait()`** — Simplifies request/response patterns for non-streaming use cases.

---

## Stack Recommendation

**Azure AI Foundry + `@github/copilot-sdk` + AG-UI + CopilotKit** is the most ergonomic stack we found for enterprise agents with real-time UIs:

| Layer | Role | Replaceable? |
|---|---|---|
| **Azure AI Foundry** | Orchestration + governance | Could swap for Copilot SDK (but lose managed threads) |
| **GitHub Copilot SDK** | Alternative runtime + custom tools | Could swap for Foundry-only (but lose BYOK flexibility) |
| **AG-UI Protocol** | Streaming standard (17 event types) | Could use raw SSE (but lose tool visibility) |
| **CopilotKit** | React components + `useAgent` hook | Could use any AG-UI-compatible frontend |

Each layer is cleanly separated. We swapped our frontend twice during development (custom React → CopilotKit) and added the Copilot SDK as a second runtime — without touching any skill code.
