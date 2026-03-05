# ADR-003: Dual-Path Strategy — Native API First, DOM Fallback

**Status:** Accepted
**Date:** 2026-02-26
**Decision makers:** Engineering team

## Context

Enterprise web applications vary widely in API availability. Some (ServiceNow, Jira) have rich REST/GraphQL APIs. Others (legacy dashboards, external IR pages) only offer a browser-rendered UI. We needed a strategy that maximizes reliability across both.

## Decision

We adopted a **dual-path strategy**: attempt native API integration first, fall back to DOM scraping only when APIs are unavailable.

```
Agent Request → Schema Discovery (probe for OpenAPI/Swagger)
  ├── API found → REST/GraphQL connector (structured response)
  └── No API    → Playwright DOM scraping (CSS/XPath extraction)
```

## Alternatives considered

| Approach | Reliability | Speed | Maintenance |
|---|---|---|---|
| **API-only** | High (when API exists) | Fast | Low — but can't reach UI-only apps |
| **DOM-only** | Universal | Slow (full page render) | High — breaks when UI changes |
| **Dual-path (chosen)** | Highest | Fast when API, acceptable when DOM | Medium — API path is stable, DOM path needs monitoring |

## Consequences

**Positive:**
- 10x more reliable than pure DOM scraping for API-enabled apps
- Schema discovery caches results (5-min TTL) to avoid repeated probing
- REST and GraphQL connectors include transient retry with exponential backoff
- DOM fallback ensures we can still reach legacy/external apps

**Negative:**
- More complex codebase (5 modules in `src/api/` + 4 in `src/browser/`)
- Schema discovery adds latency on first request to a new app (~200-500ms)
- DOM scraping remains brittle for frequently-changing UIs

**Mitigation:** DualPathRouter logs every routing decision for observability. Cache TTL is configurable.
