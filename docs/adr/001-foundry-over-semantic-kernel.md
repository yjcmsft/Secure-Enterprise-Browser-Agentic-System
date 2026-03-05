# ADR-001: Azure AI Foundry Agent Service over Semantic Kernel

**Status:** Accepted
**Date:** 2026-02-25
**Decision makers:** Engineering team

## Context

We needed an orchestration framework for an enterprise browser automation agent that supports function calling, thread-based conversation state, and governance. The two primary options were:

1. **Azure AI Foundry Agent Service** — managed service with `@azure/ai-projects` SDK
2. **Semantic Kernel** — open-source orchestration SDK with plugins

## Decision

We chose **Azure AI Foundry Agent Service** as the agent orchestrator.

## Alternatives considered

| Criteria | Azure AI Foundry | Semantic Kernel |
|---|---|---|
| Thread management | Built-in (persistent threads per user) | Manual (developer manages state) |
| Function tools | Native `FunctionToolDefinition[]` with JSON Schema | Plugin system with decorators |
| Governance | Foundry-level policies, compliance dashboard | Self-managed |
| Agent lifecycle | Managed (create → run → poll → complete) | Self-hosted loop |
| Azure integration | First-party (same control plane as OpenAI) | Connectors required |
| AG-UI compatibility | Thread runs map cleanly to AG-UI events | Requires custom adapter |

## Consequences

**Positive:**
- Thread isolation per user/session is enterprise-ready out of the box
- Function tool definitions map 1:1 to our skill registry
- Agent lifecycle (start/stop/delete) is atomic and auditable
- Direct integration with Azure AI Content Safety via Foundry policies

**Negative:**
- SDK is in beta — type definitions occasionally require `as unknown as X` casts
- Run polling required (no native streaming from `createRun()` yet)
- Tighter coupling to Azure (Semantic Kernel is cloud-agnostic)

**Mitigation:** AG-UI handler bridges the polling gap with SSE streaming to frontends.
