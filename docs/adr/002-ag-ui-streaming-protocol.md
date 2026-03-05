# ADR-002: AG-UI Protocol for Frontend Streaming

**Status:** Accepted
**Date:** 2026-02-25
**Decision makers:** Engineering team

## Context

The agent needs real-time streaming to frontends — showing LLM tokens as they arrive, tool call progress, and shared state updates. Options:

1. **AG-UI protocol** — open standard with 17 event types, SSE-based
2. **Custom WebSocket protocol** — bespoke events over WS
3. **OpenAI-compatible SSE** — reuse OpenAI's streaming format

## Decision

We chose the **AG-UI (Agent-User Interaction) protocol** for all frontend streaming.

## Alternatives considered

| Criteria | AG-UI | Custom WebSocket | OpenAI SSE |
|---|---|---|---|
| Standardization | Open standard, versioned spec | Proprietary | De facto standard |
| Tool call visibility | `TOOL_CALL_START/ARGS/END` events | Custom implementation | Limited (`function_call` chunk) |
| State sync | `STATE_SNAPSHOT` / `STATE_DELTA` | Custom | Not supported |
| Frontend libraries | CopilotKit, AG-UI SDKs | None | Various OpenAI wrappers |
| Bidirectional | SSE (server→client) | Full duplex | SSE (server→client) |

## Consequences

**Positive:**
- CopilotKit `useAgent` hook consumes our SSE stream with zero adapter code
- Tool call progress is visible in the UI in real-time (not opaque polling)
- `STATE_SNAPSHOT` keeps frontend and agent state synchronized automatically
- Any AG-UI-compatible frontend can plug in — not locked to one UI framework

**Negative:**
- SSE is unidirectional (server→client) — user input still requires POST requests
- `STATE_DELTA` (JSON Patch) support is limited in current AG-UI tooling
- Slightly more complex than raw OpenAI SSE for simple chat-only use cases
