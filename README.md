# 🌐 Secure Enterprise Browser Agentic System

> **One prompt. Seven apps. Three minutes. Board-ready.** ☕

An **Azure AI Foundry Agent** that securely navigates, reads, and acts across enterprise web apps — so your team doesn't have to.

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com)
[![Live Staging](https://img.shields.io/badge/Staging-Live%20%E2%9C%93-brightgreen)](https://browser-agent-app.delightfulforest-1a6d4031.centralus.azurecontainerapps.io/health)
[![Built with Azure AI Foundry](https://img.shields.io/badge/Built%20with-Azure%20AI%20Foundry-blue)](https://azure.microsoft.com/products/ai-foundry)
[![AG-UI Protocol](https://img.shields.io/badge/Streaming-AG--UI%20Protocol-purple)](https://docs.ag-ui.com)
[![GitHub Copilot SDK](https://img.shields.io/badge/Copilot%20SDK-v0.1.30-black)](https://github.com/github/copilot-sdk)
[![Tests](https://img.shields.io/badge/Tests-456%20passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/Coverage-92.88%25-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎥 Demo: Operation Skyfall

*The CEO needs a competitive revenue comparison, P1 incident status, and a stakeholder brief — before the 8 AM board meeting.*

```
 👤 "Compare GOOGL/AMZN/AAPL revenue, check ServiceNow P1s,
     analyze team work patterns, send exec brief via Teams."
     │
     ▼
 🤖 Browser Agent ── 12 skills, 3 parallel workstreams ──────────
 │
 ┌─ 📊 Workstream 1: Financial Intelligence
 │  navigate_page → SEC/IR pages → extract_content → compare_data
 │  └─ 🔄 Bot-detection fallback: SEC EDGAR XBRL API (data.sec.gov)
 │
 ├─ 🚨 Workstream 2: Incident Status
 │  navigate_page → ServiceNow → extract_content → Grafana dashboard
 │
 └─ 📡 Workstream 3: Stakeholder Brief (AG-UI streamed)
    analyze_work_patterns → create_adaptive_card → send_teams_message
     │
     ▼
 ✅ Executive brief delivered via Teams in 2m 47s
    (all outputs screened by Azure AI Content Safety)
    (AG-UI events streamed to frontend in real-time)
```

**Before:** 3 people · 7 apps · 4+ hours → **After:** 1 prompt · 12 apps · **3 minutes** ⚡

---

## 💰 Enterprise ROI

| Metric | Pilot-Measured Value |
|---|---|
| **Time saved per workflow** | 31.1 minutes avg (37.8 min financial, 17.6 min IT ops) |
| **Error reduction** | 0% errors across 59 pilot workflows |
| **Compliance overhead** | Zero — audit trail + PII redaction are automatic |
| **User satisfaction** | 4.7/5 from 8 pilot participants |
| **Deployment time** | <10 minutes (Bicep IaC + `azd up`) |

> 📊 Pilot results from 2 enterprise scenarios (Financial Services + IT Operations) — see [docs/customer-validation.md](./docs/customer-validation.md) for full data.

Industry benchmarks built into Work IQ: Financial Services, Healthcare, Manufacturing, Retail, Technology — see `WorkIQConnector.getIndustryBenchmark()`.

---

## ✨ Key Features

| | Feature | Why it matters |
|---|---|---|
| 🔀 | **Dual-Path Intelligence** | REST/GraphQL APIs first, Playwright DOM fallback — 10x more reliable |
| �️ | **Bot-Detection Fallback** | Auto-detects SEC EDGAR / Cloudflare / CAPTCHA blocks → falls back to structured APIs |
| �🔒 | **Zero Trust Security** | 5-layer pipeline: Entra ID → URL allowlist → Content Safety → approval → audit |
| 🤖 | **12 Agent Skills** | Navigate, extract, fill, submit, compare, workflow + Teams, Calendar, Cards |
| 📡 | **AG-UI Streaming** | Real-time SSE → CopilotKit or any AG-UI frontend · local demo mode without Foundry |
| ☁️ | **Azure AI Foundry** | Function tools + persistent threads + governance |
| � | **[GitHub Copilot SDK](https://github.com/github/copilot-sdk)** | Alternative agent runtime via `@github/copilot-sdk` · 12 skills as custom tools · BYOK with Azure OpenAI |
| �📊 | **Fabric + Work IQ** | Lakehouse analytics + productivity metrics ("saved 4 hours") |
| 🎛️ | **13 Feature Flags** | Fine-grained runtime control per security, browser, analytics, and agent features |
| 🚀 | **One-Command Deploy** | Bicep IaC → GitHub Actions → staging → prod in <10 min |
| 🧪 | **456 Tests · 92.88% Coverage** | 54 files · unit + integration + e2e |

---

## 🏁 Quick Start

```bash
git clone https://github.com/yjcmsft/Secure-Enterprise-Browser-Agentic-System.git
cd Secure-Enterprise-Browser-Agentic-System
npm install && npm run build
npm test                          # 456 tests pass

# Deploy to Azure
cp .env.example .env              # fill in Azure credentials
az login && azd up                # provisions + deploys everything
npm start                         # http://localhost:3000
```

> **Note:** The server auto-loads `.env` at startup — no `dotenv` dependency needed. Real environment variables take precedence over `.env` values.

| Command | Description |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Run 456 tests (Vitest) |
| `npm run test:coverage` | Tests + coverage report |
| `npm run lint` | Lint source + tests |
| `npm run typecheck` | TypeScript check |

---

## 🖥️ Try It Locally

**Interactive Demo UI:** [http://localhost:3000/demo](http://localhost:3000/demo) — chat UI with skills panel, workflow execution, AG-UI streaming, and SEC EDGAR comparison.

**Live staging:** [https://browser-agent-app.delightfulforest-1a6d4031.centralus.azurecontainerapps.io](https://browser-agent-app.delightfulforest-1a6d4031.centralus.azurecontainerapps.io/health)

```bash
curl http://localhost:3000/health                           # Health check

curl -X POST http://localhost:3000/api/skills/navigate_page \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","sessionId":"s1","params":{"url":"https://learn.microsoft.com"}}'

curl -X POST http://localhost:3000/api/skills/compare_data \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","sessionId":"s1","params":{"urls":["https://www.sec.gov/cgi-bin/browse-edgar?CIK=AAPL","https://www.sec.gov/cgi-bin/browse-edgar?CIK=MSFT"],"mode":"all"}}'

curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","sessionId":"s1","prompt":"Navigate to learn.microsoft.com and extract the text"}'

curl -X POST http://localhost:3000/api/agui/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Extract the title from learn.microsoft.com","userId":"demo","sessionId":"s1"}'

curl -X POST http://localhost:3000/api/copilot \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Navigate to learn.microsoft.com and extract the title","userId":"demo","sessionId":"s1"}'
```

**Endpoints:** `/api/skills/:name` · `/api/workflow` · `/api/agui/stream` (SSE) · `/api/copilot` · `/api/approve/:id` · `/health` · `/ready` · `/api/features`

**Request correlation:** Pass `x-request-id` header → returned in response + traced in Application Insights.

---

## 📡 SEC EDGAR Dual-Path Demo

The `compare_data` skill demonstrates the **dual-path strategy** in action. SEC EDGAR blocks automated browser access with a bot-detection page — exactly when the agent falls back to the XBRL REST API at `data.sec.gov`.

```
 👤 "Compare AAPL vs MSFT revenue"
     │
     ▼
 🤖 compare_data ── 2 URLs ──────────────────────────────────────
 │
 ├─ 🔍 Is URL a known SEC EDGAR page?  ✅ Yes
 │     └─ Skip browser entirely → call SEC EDGAR XBRL API
 │
 ├─ 📡 GET data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json
 │     └─ Apple Inc: Revenue $394.33B · Net Income $97.0B · ...
 │
 ├─ 📡 GET data.sec.gov/api/xbrl/companyfacts/CIK0000789019.json
 │     └─ Microsoft: Revenue $245.12B · Net Income $88.1B · ...
 │
 └─ 📊 Structured comparison table returned to UI
       (formatted currency, fiscal year, recent filings)
```

**Without dual-path:** SEC returns a bot-detection page → agent gets garbage text.
**With dual-path:** Agent detects it's an SEC URL → calls XBRL API → gets structured GAAP financials.

```bash
# Try it:
curl -X POST http://localhost:3000/api/skills/compare_data \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","sessionId":"s1","params":{"urls":["https://www.sec.gov/cgi-bin/browse-edgar?CIK=AAPL","https://www.sec.gov/cgi-bin/browse-edgar?CIK=MSFT"],"mode":"all"}}'
```

### Supported Tickers (pre-mapped CIK)

`AAPL` · `MSFT` · `GOOGL` · `AMZN` · `META` · `TSLA` · `NVDA` · `JPM` · `V` · `JNJ` · `WMT` · `PG` · `UNH` · `MA` · `HD`

Any numeric CIK also works (e.g., `320193` for Apple).

### Bot-Detection Patterns Recognized

| Provider | Pattern | Fallback |
|---|---|---|
| **SEC EDGAR** | "Undeclared Automated Tool", rate limit, filing block | SEC XBRL API |
| **Cloudflare** | Browser challenge, challenge-platform | Generic API |
| **CAPTCHA** | reCAPTCHA, hCaptcha | Generic API |
| **Generic** | "Access denied...automated" | Generic API |

---

## 🏗️ Architecture

| Service | Role |
|---|---|
| **Azure AI Foundry** | Agent lifecycle, 12 function tools, thread management |
| **[GitHub Copilot SDK](https://github.com/github/copilot-sdk)** | Alternative agent runtime, 12 custom tools, BYOK |
| **Azure OpenAI** | GPT-4o for planning + generation |
| **Entra ID** | SSO, RBAC, per-skill token delegation |
| **Container Apps** | Auto-scaling runtime (0→20 replicas) |
| **Key Vault** | Zero secrets in code |
| **Cosmos DB** | Immutable audit trail |
| **Content Safety** | Input/output screening, PII redaction |
| **Graph API** | Teams, Calendar, Adaptive Cards |

> 📖 Full details: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🛡️ Security & Responsible AI

```
Request → Entra ID → URL Allowlist → Content Safety (input)
  → Agent → Approval Gate (writes) → Content Safety (output)
  → Audit Log (Cosmos DB) → Response
```

| Principle | How |
|---|---|
| **Privacy** | PII auto-redaction · data residency per region |
| **Accountability** | Human approval for writes · immutable audit trail |
| **Reliability** | API→DOM fallback · bot-detection auto-recovery · retry with backoff · health probes |
| **Compliance** | SOC 2 · ISO 27001 · GDPR · HIPAA-eligible |

> 📝 Full Responsible AI transparency card: [RESPONSIBLE_AI.md](./RESPONSIBLE_AI.md) — bias testing, content safety thresholds, human oversight protocols, limitations & known risks.

---

## 🎛️ Feature Flags

13 runtime flags across 4 categories (Security, Browser, Analytics, Agent), configurable via `feature-flags.txt` and exposed at `GET /api/features`. Each security pipeline step is independently toggleable.

---

## 🧪 Test Coverage

**456 tests** across 54 files · **92.88% statements** · 87.62% branches · 94.85% functions · 93.15% lines

Browser module: 100% across all metrics. Run `npm run test:coverage` for the full report.

---

## 📂 Repository Structure

```
src/                          # 50 TypeScript source files
├── index.ts                  # Express server + endpoints
├── foundry-agent.ts          # Azure AI Foundry (12 function tools)
├── copilot-sdk.ts            # GitHub Copilot SDK (12 custom tools)
├── agui-handler.ts           # AG-UI SSE streaming + local demo mode
├── config.ts                 # Zod config + .env loader
├── skills/                   # 8 browser skills + registry
├── security/                 # 5-layer pipeline (7 modules)
├── api/                      # Dual-path + bot-detection + SEC EDGAR
├── browser/                  # Playwright pool + DOM parser
├── graph/                    # Teams, Calendar, Cards, Work Patterns
├── fabric/                   # Fabric Lakehouse + Work IQ
└── orchestrator/             # Task planner + tool router

frontend/                     # Interactive demo UI
infra/                        # Bicep IaC (8 modules, dev/staging/prod)
scripts/                      # Deploy, demo, OIDC setup
tests/                        # 456 tests across 54 files
docs/adr/                     # 6 Architecture Decision Records
app-package/                  # Azure AI Foundry agent manifest
```

---

##  Documentation

[ARCHITECTURE.md](./ARCHITECTURE.md) · [agents.md](./agents.md) · [skills.md](./skills.md) · [RESPONSIBLE_AI.md](./RESPONSIBLE_AI.md) · [CHANGELOG.md](./CHANGELOG.md) · [docs/customer-validation.md](./docs/customer-validation.md) · [docs/copilot-sdk-feedback.md](./docs/copilot-sdk-feedback.md) · [docs/adr/](./docs/adr/)

---

## 💬 Product Feedback: Azure AI Agent Service SDK + AG-UI

### ✅ What works well

1. **Function tool definitions** — Defining 12 skills as `FunctionToolDefinition[]` with JSON Schema is clean and type-safe.
2. **Persistent threads** — Thread isolation per user eliminates manual context tracking.
3. **AG-UI event model** — 17 event types map perfectly to agentic UIs (tool progress, state sync, message streaming).
4. **CopilotKit interop** — Frontend consumes SSE stream with one `useAgent()` hook call.

### 🔧 Opportunities for improvement

1. **Streaming runs** (highest impact) — Native SSE from `createStream()` would eliminate our 500ms polling loop and reduce the AG-UI bridge from ~40 lines to ~10.
2. **Tool call batching** — A batch `submitToolOutputs` API for parallel tool calls would reduce round-trips.
3. **AG-UI STATE_DELTA** — JSON Patch deltas instead of full `STATE_SNAPSHOT` would cut payload ~80%.
4. **TypeScript generics** — Generic inference on `runs.create<ThreadRun>()` would eliminate type casts.

### 💡 Stack Recommendation

**Azure AI Foundry + GitHub Copilot SDK + AG-UI + CopilotKit** — most ergonomic stack for enterprise agents with real-time UIs. Each layer is cleanly separated; we swapped frontends twice without touching agent code.

> 📝 Full Copilot SDK product feedback with code examples: [docs/copilot-sdk-feedback.md](./docs/copilot-sdk-feedback.md)

---

## License

[MIT](./LICENSE)
