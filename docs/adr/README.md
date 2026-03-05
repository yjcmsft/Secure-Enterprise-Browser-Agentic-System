# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Secure Enterprise Browser Agentic System.

ADRs document the key technical choices made during development — the context, options considered, decisions taken, and rationale behind them. They serve as a lightweight, version-controlled decision log for the team.

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](./001-foundry-over-semantic-kernel.md) | Azure AI Foundry Agent Service over Semantic Kernel | Accepted | 2026-02-25 |
| [002](./002-ag-ui-streaming-protocol.md) | AG-UI protocol for frontend streaming | Accepted | 2026-02-25 |
| [003](./003-dual-path-api-dom.md) | Dual-path strategy: Native API first, DOM fallback | Accepted | 2026-02-26 |
| [004](./004-security-pipeline-layered.md) | Layered security pipeline architecture | Accepted | 2026-02-26 |
| [005](./005-fabric-analytics-integration.md) | Microsoft Fabric for analytics and Work IQ | Accepted | 2026-02-27 |
| [006](./006-bicep-iac-over-terraform.md) | Bicep IaC over Terraform | Accepted | 2026-02-27 |

## Template

Use this template when adding a new ADR:

```markdown
# ADR-NNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD
**Decision makers:** [names]

## Context
What is the issue that motivates this decision?

## Decision
What is the change we are making?

## Alternatives considered
What other options were evaluated?

## Consequences
What are the trade-offs?
```
