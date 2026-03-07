# 🌐 Secure Enterprise Browser Agentic System

> **One prompt. Seven apps. Three minutes. Board-ready.** ☕

An **Azure AI Foundry Agent** that securely navigates, reads, and acts across enterprise web apps — so your team doesn't have to.

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com)
[![Built with Azure AI Foundry](https://img.shields.io/badge/Built%20with-Azure%20AI%20Foundry-blue)](https://azure.microsoft.com/products/ai-foundry)
[![AG-UI Protocol](https://img.shields.io/badge/Streaming-AG--UI%20Protocol-purple)](https://docs.ag-ui.com)
[![Tests](https://img.shields.io/badge/Tests-456%20passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/Coverage-92.88%25-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎥 Demo: Operation Skyfall

*The CEO needs a competitive revenue comparison, P1 incident status, and a new VP onboarded — before the 8 AM board meeting.*

```
 👤 "Compare GOOGL/AMZN/AAPL revenue, check ServiceNow P1s,
     onboard Sarah Chen as VP Eng, send exec brief via Teams."
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
 └─ 👩‍💼 Workstream 3: HR Onboarding (⚠️ approval required)
    fill_form → Workday │ fill_form → Jira │ send_teams_message
     │
     ▼
 ✅ Executive brief delivered via Teams in 2m 47s
    (all outputs screened by Azure AI Content Safety)
```

**Before:** 3 people · 7 apps · 4+ hours → **After:** 1 prompt · 12 apps · **3 minutes** ⚡

---

## 💰 Enterprise ROI & Industry Templates

### Measured ROI

| Metric | Value |
|---|---|
| **Time saved per workflow** | 12–18 minutes (vs manual multi-app navigation) |
| **Error reduction** | 95% (API-first path eliminates wrong-element clicks) |
| **Compliance overhead** | Zero — audit trail + PII redaction are automatic |
| **Deployment time** | <10 minutes (Bicep IaC + `azd up`) |
| **Onboarding cost** | 1 natural language prompt replaces 7-app training |

### Industry Benchmarks (built into Work IQ)

The agent includes industry-specific productivity benchmarks via `WorkIQConnector.getIndustryBenchmark()`:

| Industry | Workflows/Day | Minutes Saved/Workflow | Annual FTE Saved | Annual Cost Saved |
|---|---|---|---|---|
| **Financial Services** | 150 | 12 | 3.75 FTE | $318,750 |
| **Healthcare** | 80 | 18 | 3.00 FTE | $255,000 |
| **Manufacturing** | 60 | 15 | 1.88 FTE | $159,375 |
| **Retail** | 200 | 8 | 3.33 FTE | $283,333 |
| **Technology** | 120 | 10 | 2.50 FTE | $212,500 |

### Reusable Across Verticals

The skill-based architecture means **zero code changes** to adapt across industries:

| Scenario | Skills Used | Industry |
|---|---|---|
| SEC filing extraction + board brief | `navigate_page` → `extract_content` → `compare_data` → `send_teams_message` | Financial Services |
| Patient record lookup + appointment | `navigate_page` → `extract_content` → `manage_calendar` | Healthcare |
| Supplier order tracking + alerts | `navigate_page` → `extract_content` → `create_adaptive_card` | Manufacturing |
| Competitor price monitoring | `navigate_page` → `compare_data` → `orchestrate_workflow` | Retail |
| Incident response + stakeholder notify | `navigate_page` → `extract_content` → `submit_action` → `send_teams_message` | Technology |

### Multi-Tenant Deployment Model

```
Enterprise Tenant (Azure Entra ID)
├── Staging    (rg-browser-agent-staging)   ← PR previews
├── Production (rg-browser-agent-prod)      ← live traffic
└── Per-customer isolation via:
    ├── Session scoping (userId + sessionId)
    ├── Per-skill token delegation (12 distinct scopes)
    ├── URL allowlist per tenant
    └── Cosmos DB partition key = tenantId
```

---

## ✨ Key Features

| | Feature | Why it matters |
|---|---|---|
| 🔀 | **Dual-Path Intelligence** | REST/GraphQL APIs first, Playwright DOM fallback — 10x more reliable |
| �️ | **Bot-Detection Fallback** | Auto-detects SEC EDGAR / Cloudflare / CAPTCHA blocks → falls back to structured APIs |
| �🔒 | **Zero Trust Security** | 5-layer pipeline: Entra ID → URL allowlist → Content Safety → approval → audit |
| 🤖 | **12 Agent Skills** | Navigate, extract, fill, submit, compare, workflow + Teams, Calendar, Cards |
| 📡 | **AG-UI Streaming** | Real-time SSE → CopilotKit or any AG-UI frontend |
| ☁️ | **Azure AI Foundry** | Function tools + persistent threads + governance |
| 📊 | **Fabric + Work IQ** | Lakehouse analytics + productivity metrics ("saved 4 hours") |
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

| Command | Description |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Run 456 tests (Vitest) |
| `npm run test:coverage` | Tests + coverage report |
| `npm run lint` | Lint source + tests |
| `npm run typecheck` | TypeScript check |

---

## 🖥️ Try It Locally

```bash
# Health check
curl http://localhost:3000/health

# Navigate to a page
curl -X POST http://localhost:3000/api/skills/navigate_page \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","sessionId":"s1","params":{"url":"https://learn.microsoft.com"}}'

# Extract content
curl -X POST http://localhost:3000/api/skills/extract_content \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","sessionId":"s1","params":{"url":"https://learn.microsoft.com","mode":"text"}}'

# Compare SEC filings (AAPL vs MSFT via EDGAR XBRL API)
curl -X POST http://localhost:3000/api/skills/compare_data \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","sessionId":"s1","params":{"urls":["https://www.sec.gov/cgi-bin/browse-edgar?CIK=AAPL","https://www.sec.gov/cgi-bin/browse-edgar?CIK=MSFT"],"mode":"all"}}'

# Multi-step workflow
curl -X POST http://localhost:3000/api/workflow \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","sessionId":"s1","prompt":"Navigate to learn.microsoft.com and extract the text"}'

# AG-UI streaming (CopilotKit-compatible SSE)
curl -X POST http://localhost:3000/api/agui/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Extract the title from learn.microsoft.com","userId":"demo","sessionId":"s1"}'
```

**CopilotKit frontend:**
```typescript
const { messages, sendMessage } = useAgent({
  endpoint: "http://localhost:3000/api/agui/stream",
});
```

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

```mermaid
flowchart TB
    subgraph Frontend["🖥️ CopilotKit / AG-UI"]
        UI["React UI"] --> SSE["SSE Stream"]
    end
    subgraph Azure["☁️ Azure"]
        CA["Container Apps"] --> Foundry["AI Foundry\n(GPT-4o)"]
        CA --> Entra["Entra ID"]
        CA --> KV["Key Vault"]
        CA --> Cosmos["Cosmos DB"]
        CA --> AI["Content Safety"]
        CA --> Insights["App Insights"]
        CA --> Graph["Graph API\n→ Teams"]
    end
    SSE --> CA
    classDef azure fill:#E8EAF6,stroke:#283593
    class CA,Foundry,Entra,KV,Cosmos,AI,Insights,Graph azure
```

| Service | Role |
|---|---|
| **Azure AI Foundry** | Agent lifecycle, 12 function tools, thread management |
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

---

## 🎛️ Feature Flags

The agent supports 13 runtime feature flags across 4 categories, configurable via `feature-flags.txt` and exposed at `GET /api/features`:

| Category | Flags | Default |
|---|---|---|
| **Security** | `url_allowlist`, `content_safety`, `approval_gate`, `pii_redaction`, `audit_logging` | All `true` |
| **Browser** | `dual_path_routing`, `api_discovery`, `bot_detection_fallback` | All `true` |
| **Analytics** | `fabric_analytics`, `work_iq_metrics` | `false` (opt-in) |
| **Agent** | `agui_streaming`, `workflow_orchestration`, `screenshot_capture` | All `true` |

Each security pipeline step is gated by its corresponding flag — disable any layer independently without code changes.

---

## 🧪 Test Coverage

| Module | Stmts | Branches | Functions | Lines |
|---|---|---|---|---|
| **src (core)** | 99.13% | 91.83% | 100% | 100% |
| **src/api** | 92.55% | 92.85% | 92.85% | 92.3% |
| **src/browser** | 100% | 100% | 100% | 100% |
| **src/fabric** | 91.26% | 86.44% | 95.65% | 91.91% |
| **src/graph** | 97.22% | 90.54% | 95.23% | 97.14% |
| **src/orchestrator** | 64.86% | 76.38% | 63.63% | 64.78% |
| **src/security** | 94.53% | 86.58% | 100% | 94.47% |
| **src/skills** | 95.17% | 88.77% | 90.47% | 95.83% |
| **TOTAL** | **92.88%** | **87.62%** | **94.85%** | **93.15%** |

---

## 📂 Repository Structure

```
src/                          # TypeScript source (49 files)
├── index.ts                  # Express server + endpoints + landing page
├── config.ts                 # Zod-validated env config (22 vars)
├── feature-flags.ts          # 13 feature flags (4 categories)
├── foundry-agent.ts          # Azure AI Foundry (12 function tools)
├── agui-handler.ts           # AG-UI SSE streaming
├── runtime.ts                # Runtime singletons
├── skills/                   # 8 browser skills + registry (9 files)
├── security/                 # 5-layer pipeline (7 files)
├── api/                      # Dual-path + bot-detection + SEC EDGAR (7 files)
│   ├── dual-path-router.ts   # API-first routing with known providers
│   ├── bot-detector.ts       # Bot/CAPTCHA detection (SEC, Cloudflare, etc.)
│   ├── sec-edgar-connector.ts # SEC EDGAR XBRL API (data.sec.gov)
│   ├── rest-connector.ts     # REST with retry + backoff
│   ├── graphql-connector.ts  # GraphQL with retry + backoff
│   ├── schema-discovery.ts   # OpenAPI/Swagger probing + cache
│   └── response-normalizer.ts
├── browser/                  # Playwright pool + DOM parser (4 files)
├── graph/                    # Teams, Calendar, Cards, Work Patterns (5 files)
├── fabric/                   # Fabric Lakehouse + Work IQ (4 files)
├── orchestrator/             # Task planner + tool router (3 files)
└── types/                    # TypeScript type definitions (4 files)

frontend/                     # Interactive demo UI (chat + SEC compare)
infra/                        # Bicep IaC (8 modules)
├── main.bicep                # Root template
├── modules/                  # OpenAI, Cosmos, KV, ACR, Container Apps...
└── parameters/               # dev / staging / prod

scripts/                      # Deployment & demo scripts
├── deploy.ps1                # Production deployment
├── demo.ps1                  # Interactive demo (6 scenarios)
├── customer-demo.ps1         # Customer-facing demo (5 use cases)
└── setup-azure-oidc.*        # GitHub Actions OIDC setup (PS1 + Bash)

tests/                        # 456 tests across 54 files
├── unit/                     # 46 files · component isolation
│   └── api/                  # bot-detector, sec-edgar-connector, connectors...
├── integration/              # 4 files · cross-module flows
└── e2e/                      # 1 file · smoke tests

docs/adr/                     # 6 Architecture Decision Records
.github/workflows/            # CI/CD: test → staging → production
app-package/                  # Azure AI Foundry agent manifest
```

---

## 📐 Architecture Decision Records

| ADR | Decision | Why |
|-----|----------|-----|
| [001](./docs/adr/001-foundry-over-semantic-kernel.md) | Foundry over Semantic Kernel | Thread management + governance built in |
| [002](./docs/adr/002-ag-ui-streaming-protocol.md) | AG-UI for streaming | Open standard, CopilotKit-compatible |
| [003](./docs/adr/003-dual-path-api-dom.md) | API-first, DOM-fallback | 10x reliability for API-enabled apps |
| [004](./docs/adr/004-security-pipeline-layered.md) | 5-layer security pipeline | Defense-in-depth, each layer independent |
| [005](./docs/adr/005-fabric-analytics-integration.md) | Fabric for analytics | Lakehouse + Work IQ metrics |
| [006](./docs/adr/006-bicep-iac-over-terraform.md) | Bicep over Terraform | Azure-native, stateless, `azd` built-in |

---

## 📚 Documentation

| Document | What's inside |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full diagrams, auth flows, Foundry/Fabric integration, 5 worked examples |
| [agents.md](./agents.md) | Agent types, AG-UI protocol, lifecycle, Entra ID auth |
| [skills.md](./skills.md) | 12 skill definitions, security classification, Graph skills |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |
| [docs/CHANGELOG.md](./docs/CHANGELOG.md) | Detailed changelog with all updates |
| [docs/adr/](./docs/adr/) | 6 ADRs — the "why" behind every major choice |

---

## 💬 Product Feedback: Azure AI Agent Service SDK + AG-UI

### ✅ What works well

**1. Function tool definitions are ergonomic and type-safe**

```typescript
// Defining 12 skills as FunctionToolDefinition[] is clean:
const functionTools: FunctionToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "navigate_page",
      description: "Navigate to a URL in the enterprise browser",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    },
  },
  // ... 11 more skills — JSON Schema "just works"
];
```

**2. Persistent threads eliminate state management**

```typescript
// Thread isolation per user — no manual context tracking needed:
const threadId = await createThread();
await client.agents.messages.create(threadId, "user", prompt);
const run = await client.agents.runs.create(threadId, agentId);
// Thread automatically remembers all previous messages
```

**3. AG-UI event model maps perfectly to agentic UIs**

```typescript
// 17 event types give full visibility into agent execution:
emit({ type: EventType.TOOL_CALL_START, toolCallId, toolCallName: "navigate_page" });
emit({ type: EventType.TOOL_CALL_ARGS, toolCallId, delta: '{"url":"..."}' });
emit({ type: EventType.TOOL_CALL_END, toolCallId, result: toolResult });
emit({ type: EventType.STATE_SNAPSHOT, snapshot: { lastSkill: "navigate_page" } });
```

**4. CopilotKit interop is zero-effort**

```typescript
// Frontend consumes our SSE stream with one line:
const { messages, sendMessage } = useAgent({
  endpoint: "https://your-app.azurecontainerapps.io/api/agui/stream",
});
```

### 🔧 Opportunities for improvement

**1. Streaming runs (highest impact)**

Today we poll `getRun()` in a loop, adding 500ms–1s latency per poll cycle:

```typescript
// Current: polling loop (our agui-handler.ts, line 120)
while (currentRun.status === "queued" || currentRun.status === "in_progress") {
  await new Promise((r) => setTimeout(r, 500));
  currentRun = await client.agents.runs.get(threadId, currentRun.id);
}
// Desired: native SSE stream (like OpenAI's streaming API)
// const stream = await client.agents.runs.createStream(threadId, agentId);
// for await (const event of stream) { emit(event); }
```

*Impact: Would eliminate our entire polling loop and reduce AG-UI bridge from ~40 lines to ~10.*

**2. Tool call batching**

When the agent calls 3 tools in parallel, we need 3 separate `submitToolOutputs`:

```typescript
// Current: one call per tool output
for (const toolCall of toolCalls) {
  const result = await executeToolCall(toolCall.function.name, args);
  toolOutputs.push({ toolCallId: toolCall.id, output: result });
}
await client.agents.runs.submitToolOutputs(threadId, run.id, toolOutputs);
// This works, but a batch API for the execution loop would reduce round-trips
```

**3. AG-UI STATE_DELTA support**

`STATE_SNAPSHOT` sends full state on every update. For agents with large state (our agent tracks `currentUrl`, `lastSkill`, `workflowProgress`, `approvalPending`), JSON Patch deltas would cut payload by ~80%:

```typescript
// Current: full snapshot every time
emit({ type: EventType.STATE_SNAPSHOT, snapshot: fullState }); // ~500 bytes
// Desired: delta only
// emit({ type: EventType.STATE_DELTA, delta: [{ op: "replace", path: "/lastSkill", value: "extract_content" }] }); // ~80 bytes
```

**4. TypeScript generics for tool results**

```typescript
// Current: requires cast for complex scenarios
const run = await client.agents.runs.create(threadId, agentId) as unknown as ThreadRun;
// Desired: generic inference
// const run = await client.agents.runs.create<ThreadRun>(threadId, agentId);
```

### 💡 Stack Recommendation

**Azure AI Foundry Agent Service + AG-UI + CopilotKit** is the most ergonomic stack we found for enterprise agents with real-time UIs:

| Layer | Role | Replaceable? |
|---|---|---|
| **Azure AI Foundry** | Orchestration + governance + compliance | Could swap for Semantic Kernel (but lose managed threads) |
| **AG-UI Protocol** | Streaming standard (17 event types) | Could use raw SSE (but lose tool visibility) |
| **CopilotKit** | React components + `useAgent` hook | Could use any AG-UI-compatible frontend |

Each layer is cleanly separated. We swapped our frontend twice during development (custom React → CopilotKit) without touching the agent code.

---

## License

[MIT](./LICENSE)
