# ADR-005: Microsoft Fabric for Analytics and Work IQ

**Status:** Accepted
**Date:** 2026-02-27
**Decision makers:** Engineering team

## Context

The agent generates rich operational data — audit logs, skill performance metrics, and productivity measurements. We needed an analytics backend that could ingest this data at scale, run SQL analytics, and surface Work IQ productivity insights.

## Decision

We chose **Microsoft Fabric** (Lakehouse + Data Pipelines) as the analytics platform, with a custom **Work IQ connector** for productivity measurement.

## Alternatives considered

| Approach | Strengths | Weaknesses |
|---|---|---|
| **Azure Data Explorer (ADX)** | Fast time-series queries | Separate from Fabric ecosystem |
| **Power BI direct** | Familiar BI tool | No programmatic ingestion API |
| **Microsoft Fabric (chosen)** | Lakehouse tables + SQL + Pipelines + Work IQ | Newer service, API still evolving |

## Consequences

**Positive:**
- `FabricClient` streams audit events to Lakehouse tables via REST API
- `AnalyticsPipeline` provides buffered ingestion with configurable flush intervals
- `WorkIQConnector` calculates time saved per skill with realistic manual baselines
- SQL analytics endpoint enables on-demand productivity queries
- Data pipeline triggers enable scheduled batch processing

**Negative:**
- Fabric REST API requires Azure Entra ID token acquisition per session
- Lakehouse table load API has eventual consistency (~seconds)
- Work IQ baselines are estimates — real values vary by organization

**Mitigation:**
- Token caching in `FabricClient` prevents repeated auth calls
- Buffered ingestion (100 events / 30s flush) batches for efficiency
- Enable/disable toggle (`FABRIC_ENABLED`) for environments without Fabric
