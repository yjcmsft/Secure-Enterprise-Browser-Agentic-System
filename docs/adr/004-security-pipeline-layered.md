# ADR-004: Layered Security Pipeline Architecture

**Status:** Accepted
**Date:** 2026-02-26
**Decision makers:** Engineering team

## Context

An enterprise browser agent that navigates internal apps and submits forms on behalf of users is a high-risk system. Every action must be authorized, screened, auditable, and reversible. We needed a security architecture that enforces defense-in-depth without impeding the agent's core functionality.

## Decision

We implemented a **5-layer security pipeline** that every request passes through sequentially:

```
1. URL Allowlist Gate       → Block navigation to unapproved domains
2. Content Safety (Input)   → Screen prompts for injection/harmful content
3. Auth Delegation          → Acquire per-skill scoped tokens via Entra ID
4. Approval Gate            → Human-in-the-loop for all write actions
5. Content Safety (Output)  → Redact PII, screen agent responses
6. Audit Logger             → Immutable log to Cosmos DB
```

## Alternatives considered

| Approach | Coverage | Complexity | User friction |
|---|---|---|---|
| **Single middleware check** | Low — one gate, one bypass | Simple | Low |
| **Per-skill security decorators** | Medium — inconsistent across skills | Medium | Variable |
| **Layered pipeline (chosen)** | Complete — every layer is independent | Higher | Controlled — approval only for writes |

## Consequences

**Positive:**
- Each layer can be tested, disabled, or replaced independently
- Typed error codes (`URL_NOT_ALLOWED`, `INPUT_BLOCKED`, `APPROVAL_DENIED`, `OUTPUT_BLOCKED`) enable precise debugging
- Audit entries include correlation IDs, error codes, and denied reasons
- Content Safety uses Azure AI service when configured, regex fallback when not — works in both cloud and local dev

**Negative:**
- 5 layers add latency (~50-100ms overhead per request)
- Approval gate adds user friction for write actions (intentional)
- PII redaction can over-match (mitigated with business term whitelist)

**Mitigation:** Readiness probe (`GET /ready`) validates all security components on startup. Audit logger falls back to in-memory store when Cosmos is unavailable.
