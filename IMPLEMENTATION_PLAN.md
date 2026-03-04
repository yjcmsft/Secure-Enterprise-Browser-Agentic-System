# Implementation Plan — Secure Enterprise Browser Agentic System

## Problem Statement

The repository contains comprehensive design documentation (README.md, ARCHITECTURE.md, agents.md, skills.md) and an implemented TypeScript codebase for an Azure AI Foundry Agent (pro-code, Microsoft Agent Framework) that automates browser-based enterprise workflows with AG-UI streaming. This plan remains as the implementation reference across 12 phases.

## Technology Choices

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | **TypeScript / Node.js** | Azure AI Projects SDK is TypeScript-native; AG-UI protocol has first-class TS support |
| Browser Automation | **Playwright** (via J-browser-agents pattern) | Cross-browser headless automation, mature API, built-in selectors |
| HTTP Client | **axios** | REST/GraphQL API calls |
| Testing | **Vitest** | Fast, TypeScript-native, ESM-ready |
| Containerization | **Docker** | Azure Container Apps deployment |
| IaC | **Bicep** | Azure-native, as documented |
| CI/CD | **GitHub Actions** | As documented in README |

---

## Proposed Directory Structure

```
secure-browser-agent/
├── package.json
├── tsconfig.json
├── eslint.config.js
├── Dockerfile
├── .env.example
├── app-package/                     # Azure AI Foundry agent config
│   ├── manifest.json
│   ├── declarativeAgent.json
│   ├── browserPlugin.json
│   ├── openapi/
│   │   ├── browser-tools.yml
│   │   └── api-connectors.yml
│   ├── color.png
│   └── outline.png
├── infra/                           # Bicep IaC
│   ├── main.bicep
│   ├── modules/
│   │   ├── container-app.bicep
│   │   ├── openai.bicep
│   │   ├── cosmos.bicep
│   │   ├── keyvault.bicep
│   │   ├── monitoring.bicep
│   │   └── content-safety.bicep
│   └── parameters/
│       ├── dev.bicepparam
│       ├── staging.bicepparam
│       └── prod.bicepparam
├── src/
│   ├── index.ts                     # Entry point (Container Apps server)
│   ├── config.ts                    # Environment configuration
│   ├── skills/                      # Skill implementations
│   │   ├── index.ts                 # Skill registry
│   │   ├── navigate-page.ts
│   │   ├── extract-content.ts
│   │   ├── fill-form.ts
│   │   ├── submit-action.ts
│   │   ├── discover-apis.ts
│   │   ├── capture-screenshot.ts
│   │   ├── compare-data.ts
│   │   └── orchestrate-workflow.ts
│   ├── graph/                       # Microsoft Graph skills
│   │   ├── send-teams-message.ts
│   │   ├── create-adaptive-card.ts
│   │   ├── manage-calendar.ts
│   │   └── analyze-work-patterns.ts
│   ├── security/                    # Security boundary layer
│   │   ├── index.ts
│   │   ├── url-allowlist.ts
│   │   ├── auth-delegation.ts
│   │   ├── approval-gate.ts
│   │   ├── audit-logger.ts
│   │   └── content-safety.ts
│   ├── browser/                     # Browser automation layer
│   │   ├── browser-pool.ts
│   │   ├── dom-parser.ts
│   │   ├── session-manager.ts
│   │   └── element-selector.ts
│   ├── api/                         # Native API integration
│   │   ├── schema-discovery.ts
│   │   ├── rest-connector.ts
│   │   ├── graphql-connector.ts
│   │   ├── response-normalizer.ts
│   │   └── dual-path-router.ts
│   ├── orchestrator/                # Agent orchestrator
│   │   ├── task-planner.ts
│   │   ├── memory-store.ts
│   │   └── tool-router.ts
│   └── types/                       # Shared TypeScript types
│       ├── skills.ts
│       ├── security.ts
│       ├── browser.ts
│       └── api.ts
├── tests/
│   ├── unit/
│   │   ├── skills/
│   │   ├── security/
│   │   ├── browser/
│   │   └── api/
│   ├── integration/
│   │   ├── workflows/
│   │   └── security-flows/
│   └── e2e/
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## Implementation Phases

### Phase 1: Project Foundation

Set up the TypeScript/Node.js project scaffolding, tooling, and development environment.

**Deliverables:**
- `package.json` with dependencies: `playwright`, `axios`, `@azure/identity`, `@azure/cosmos`, `@azure/ai-content-safety`, `@azure/keyvault-secrets`, `@microsoft/microsoft-graph-client`, `express`, `winston`, `zod`
- `tsconfig.json` — strict mode, ESM (`NodeNext`), path aliases
- `eslint.config.js` + `.prettierrc` — code style enforcement
- `vitest.config.ts` — test runner configuration
- `.env.example` — all required environment variables documented
- `src/config.ts` — centralized config with Zod schema validation
- `src/types/` — shared TypeScript type definitions for skills, security, browser, and API layers

**Dependencies:** None (starting point)

---

### Phase 2: Agent Package

Create the agent configuration files that register the agent with Azure AI Foundry.

**Deliverables:**
- `app-package/manifest.json` — Agent manifest for Azure AI Foundry with tool registry and streaming config
- `app-package/declarativeAgent.json` — Agent config (model, instructions, streaming protocol, security settings)
- `app-package/browserPlugin.json` — Function tool definitions for all 12 skills: `navigate_page`, `extract_content`, `fill_form`, `submit_action`, `discover_apis`, `capture_screenshot`, `compare_data`, `orchestrate_workflow`, `send_teams_message`, `create_adaptive_card`, `manage_calendar`, `analyze_work_patterns`
- `app-package/openapi/browser-tools.yml` — Full OpenAPI 3.0 specification for the 8 core browser skills with parameter schemas, descriptions, and examples
- `app-package/openapi/api-connectors.yml` — OpenAPI 3.0 specification for native API connector endpoints (schema discovery, REST proxy, GraphQL proxy)
- Placeholder icon PNGs (`color.png` 192×192, `outline.png` 32×32)

**Dependencies:** Phase 1

---

### Phase 3: Security Boundary Layer

Implement the security gates that ALL skill invocations pass through. This is foundational — everything else depends on it.

**Deliverables:**
- `src/security/url-allowlist.ts` — Domain + path allowlisting with wildcard support, deny-by-default policy. Validates any URL before navigation. Configurable via environment variable or admin API.
- `src/security/auth-delegation.ts` — Azure Entra ID SSO token proxy using `@azure/identity`. Per-skill token scoping (`Application.Read` for read skills, `Application.ReadWrite` for write skills, `Application.ReadWrite.All` for submit). Key Vault integration for secret retrieval.
- `src/security/approval-gate.ts` — Human-in-the-loop approval gate for write actions (`fill_form`, `submit_action`, `send_teams_message`, `manage_calendar`). Generates approval requests, handles timeout (default 5 min), records approval/denial. Integrates with Copilot Chat UI callback.
- `src/security/audit-logger.ts` — Cosmos DB structured audit logging. Every action is logged with: `timestamp`, `userId`, `sessionId`, `skillName`, `action`, `params`, `result`, `duration_ms`, `path` (api/dom/graph), `approvalRequired`, `approved`. Immutable append-only writes.
- `src/security/content-safety.ts` — Azure AI Content Safety SDK integration. Input screening (jailbreak detection, harmful content filtering), output screening (PII detection/auto-redaction, groundedness checking). Configurable severity thresholds. PII categories: person name (redact), SSN (block), email (redact), phone (redact), credit card (block).
- `src/security/index.ts` — `SecurityGate` class that chains all gates in execution order: URL Allowlist → Auth Delegation → Content Safety (input) → Approval Gate → Audit Logger. Exports a single `executeWithSecurity(skill, params, context)` function.

**Dependencies:** Phase 1

---

### Phase 4: Browser Automation Layer

Implement the Playwright-based headless browser pool and DOM interaction utilities.

**Deliverables:**
- `src/browser/browser-pool.ts` — Managed pool of Playwright browser instances. Features: create on demand, reuse idle instances, dispose after timeout, configurable max concurrency (default 10), health monitoring. Uses Chromium headless.
- `src/browser/session-manager.ts` — Cookie/session persistence across page navigations. Auth token injection into browser context (via headers or cookies). Session isolation between concurrent users.
- `src/browser/dom-parser.ts` — DOM tree parsing utilities: table extraction (HTML `<table>` → structured `TableData`), text block extraction, link harvesting, form value reading. Supports CSS selectors and text-based label matching (e.g., find table near "SUMMARY RESULTS OF OPERATIONS").
- `src/browser/element-selector.ts` — CSS/XPath selector engine with fallback strategies. Text-based element finding (`a:contains('Annual Report')`). Wait-for-element utilities with configurable timeout. Scroll-into-view support.

**Dependencies:** Phase 1

---

### Phase 5: Native API Integration Layer

Implement the preferred API path that bypasses DOM scraping when target apps expose APIs.

**Deliverables:**
- `src/api/schema-discovery.ts` — Probe target applications for API specifications. Checks well-known paths: `/api/openapi.json`, `/swagger.json`, `/swagger/v1/swagger.json`, `/.well-known/api-spec`, `/api-docs`. Parses OpenAPI 3.0/Swagger 2.0 specs. Caches discovered schemas per domain with TTL.
- `src/api/rest-connector.ts` — Generic REST client built on axios. Supports GET/POST/PUT/PATCH/DELETE with auth header injection, request/response logging, retry with exponential backoff, timeout handling, and response typing.
- `src/api/graphql-connector.ts` — GraphQL client with query building, variable injection, and error handling. Supports schema introspection for auto-discovery. Handles pagination (cursor-based and offset-based).
- `src/api/response-normalizer.ts` — Transforms heterogeneous API responses (JSON, XML, CSV) into uniform `NormalizedResponse` format. Handles nested objects, arrays, and pagination tokens.
- `src/api/dual-path-router.ts` — Decision engine: (1) check if domain has cached API schema, (2) if yes → route to REST/GraphQL connector, (3) if no → attempt schema discovery, (4) if discovery fails → route to browser DOM path. Logs path decision for analytics.

**Dependencies:** Phase 1

---

### Phase 6: Core Agent Skills

Implement the 8 core skills that the agent exposes to the Copilot orchestrator. Each skill uses the dual-path router (API preferred, DOM fallback) and passes through the security gate.

**Deliverables:**
- `src/skills/navigate-page.ts` — Navigate to URL (validated against allowlist), optionally click a target element, scroll to element, wait for selector. Returns page title and status. API path: direct resource GET. DOM path: Playwright `page.goto()` + click/scroll actions.
- `src/skills/extract-content.ts` — Extract structured content from current page. Supports: `table` (HTML tables → markdown/JSON/CSV), `text` (text blocks with optional summarization), `links` (all links with text and href), `form_values` (current form field values), `all` (everything). API path: GET endpoint with structured response. DOM path: DOM parser utilities.
- `src/skills/fill-form.ts` — Populate form fields with provided values. Supports: text input, select/dropdown, checkbox, radio button, date picker. Requires approval gate. API path: PUT/PATCH with field data. DOM path: Playwright `page.fill()`, `page.selectOption()`, `page.check()`.
- `src/skills/submit-action.ts` — Trigger button click, form submission, or state-changing action. Always requires human-in-the-loop approval with confirmation message. API path: POST/DELETE. DOM path: Playwright `page.click()`.
- `src/skills/discover-apis.ts` — Probe target application for available API endpoints. Delegates to `schema-discovery.ts`. Returns list of discovered endpoints with method, path, description, and parameters.
- `src/skills/capture-screenshot.ts` — Take screenshot of current page or specific element. Full-page or viewport. PII auto-redaction overlay via Content Safety. Returns base64-encoded image.
- `src/skills/compare-data.ts` — Multi-source extraction: navigate to N URLs in parallel, extract specified data from each, compile into unified comparison table. Output formats: markdown, JSON, CSV.
- `src/skills/orchestrate-workflow.ts` — Multi-step workflow engine. Parses ordered list of skill invocations, executes sequentially, handles per-step approval gates, maintains state between steps (template variable substitution like `{{compiled_findings}}`), supports error recovery.
- `src/skills/index.ts` — Skill registry: maps skill names (strings) to `SkillHandler` implementations. Exports `getSkill(name)` and `listSkills()`.

**Dependencies:** Phases 3, 4, 5

---

### Phase 7: Microsoft Graph Skills

Implement the Microsoft Graph-based skills for Teams, Outlook, and productivity insights.

**Deliverables:**
- `src/graph/send-teams-message.ts` — Send message or adaptive card to Teams channel/chat via `POST /teams/{id}/channels/{id}/messages`. Supports markdown content, @mentions, and adaptive card payloads. Requires `Chat.ReadWrite` scope. Approval required for external recipients.
- `src/graph/create-adaptive-card.ts` — Generate adaptive card JSON from structured data. Three styles: `compact` (summary card), `detailed` (full data table), `executive` (KPI-focused with trend indicators). Supports action buttons. Read-only skill (no approval needed).
- `src/graph/manage-calendar.ts` — Create, read, update Outlook calendar events via `/me/events`. Find availability via `/me/findMeetingTimes`. Requires `Calendars.ReadWrite` scope. Approval required for event creation/modification.
- `src/graph/analyze-work-patterns.ts` — Work IQ integration: query agent audit logs + Graph signals to compute productivity metrics. Metrics: `time_saved`, `focus_time_recovered`, `context_switches_avoided`, `collaboration_velocity`, `error_reduction`, `meeting_impact`. Scopes: personal, team, organization. Privacy-preserving (aggregated only).

**Dependencies:** Phase 1

---

### Phase 8: Agent Orchestrator

Implement the central orchestration layer that plans and routes skill invocations.

**Deliverables:**
- `src/orchestrator/task-planner.ts` — Decompose user intent (natural language) into an ordered list of skill invocations. Uses Azure OpenAI GPT-4o for planning. Handles dependencies between steps (e.g., extract before fill). Supports parallel execution of independent steps. Outputs a `WorkflowPlan` with ordered `SkillInvocation[]`.
- `src/orchestrator/memory-store.ts` — Conversation context and workflow state management. Stores: current conversation history, extracted data from previous steps, workflow progress. Backed by Cosmos DB for persistence. In-memory cache for active sessions. Auto-purge after 30 days.
- `src/orchestrator/tool-router.ts` — Routes planned skill calls through the full execution pipeline: (1) SecurityGate validation, (2) DualPathRouter decision (API vs DOM), (3) Skill execution, (4) Response normalization, (5) Audit logging. Handles errors with retry logic and graceful degradation.

**Dependencies:** Phase 6

---

### Phase 9: HTTP Server & Entry Point

Create the Express HTTP server that Azure Container Apps hosts and that receives requests from the Azure AI Foundry Agent Service and AG-UI streaming clients.

**Deliverables:**
- `src/index.ts` — Express HTTP server with:
  - `POST /api/skills/:skillName` — Execute a skill with parameters (called by Copilot orchestrator via API plugin). Validates request body against skill parameter schema. Returns `SkillResult`.
  - `GET /health` — Container Apps health probe (returns 200 with `{ status: "healthy" }`).
  - `GET /ready` — Readiness probe (checks Cosmos DB, Key Vault, browser pool connectivity).
  - `POST /api/approve/:actionId` — Approval callback endpoint for human-in-the-loop responses.
  - `POST /api/workflow` — Execute a multi-step workflow (orchestrate_workflow skill).
  - Graceful shutdown handling (drain connections, close browser pool, flush audit logs).
  - Request logging via winston.
  - Error handling middleware with structured error responses.

**Dependencies:** Phase 8

---

### Phase 10: Azure Infrastructure (Bicep IaC)

Implement all Bicep modules for one-command Azure deployment.

**Deliverables:**
- `infra/main.bicep` — Root orchestration template. Deploys all modules with environment-specific parameters. Outputs: agent URL, OpenAI endpoint, Cosmos endpoint, App Insights key.
- `infra/modules/openai.bicep` — Azure OpenAI Service with GPT-4o deployment. SKU: S0.
- `infra/modules/cosmos.bicep` — Cosmos DB account with 3 containers: `audit-logs` (partition: `/userId`, TTL: 7 years), `workflow-state` (partition: `/sessionId`, TTL: 30 days), `conversation-memory` (partition: `/conversationId`, TTL: 30 days).
- `infra/modules/keyvault.bicep` — Key Vault with managed identity access policy. Purge protection enabled in production.
- `infra/modules/content-safety.bicep` — Azure AI Content Safety instance (SKU: S0).
- `infra/modules/monitoring.bicep` — Application Insights (workspace-based) + Azure Monitor alert rules (error rate > 1%, response time > 10s, Content Safety blocks). Action group: email notification.
- `infra/modules/container-app.bicep` — Container Apps environment + app. Managed identity. Min replicas: 2 (prod) / 0 (dev). Max replicas: 20 (prod) / 3 (dev). Environment variables injected from other module outputs. Ingress: external, port 3000.
- `infra/parameters/dev.bicepparam` — Dev environment: relaxed limits, 0 min replicas, dev alert email.
- `infra/parameters/staging.bicepparam` — Staging: moderate limits, 1 min replica.
- `infra/parameters/prod.bicepparam` — Production: strict limits, 2 min replicas, purge protection, oncall email.

**Dependencies:** Phase 1

---

### Phase 11: Containerization & CI/CD

Docker image and GitHub Actions pipelines for automated deployment.

**Deliverables:**
- `Dockerfile` — Multi-stage build: (1) Builder stage: Node 20, `npm ci`, TypeScript compile. (2) Production stage: Node 20 slim, Playwright Chromium install, `npm ci --omit=dev`, copy dist. Health check via `/health` endpoint.
- `.github/workflows/deploy.yml` — CI/CD pipeline:
  - **test** job: checkout → security scan (`microsoft/security-devops-action@v1`) → `npm test` → Bicep validation (`az bicep build`).
  - **deploy-staging** job (needs test): deploy to Azure Container Apps with staging parameters.
  - **deploy-prod** job (needs staging, environment: production): deploy with prod parameters → upload agent config package.
- `.github/workflows/test.yml` — PR validation: lint (`npm run lint`), typecheck (`npm run typecheck`), unit tests (`npm test`), Bicep template validation.

**Dependencies:** Phases 9, 10

---

### Phase 12: Testing

Comprehensive test suite covering all layers.

**Deliverables:**
- **Unit tests** (`tests/unit/`):
  - `tests/unit/skills/` — Each skill tested in isolation with mocked browser pool and API connectors. Verify parameter validation, output formatting, error handling.
  - `tests/unit/security/` — URL allowlist (allowed/blocked domains, wildcards, edge cases). Approval gate (approve/deny/timeout flows). Audit logger (log entry structure, Cosmos write). Content Safety (safe/unsafe input, PII redaction).
  - `tests/unit/browser/` — Browser pool (create/reuse/dispose lifecycle). DOM parser (table extraction from sample HTML, text extraction, link harvesting). Element selector (CSS, XPath, text-based).
  - `tests/unit/api/` — Schema discovery (OpenAPI parsing, well-known path probing). REST connector (GET/POST with auth headers). Dual-path router (API available → API path, not available → DOM path).
- **Integration tests** (`tests/integration/`):
  - `tests/integration/workflows/` — Cross-skill workflow tests: navigate → extract → fill → submit chain. Compare-data with 3 mock sources. Orchestrate-workflow with multi-step approval.
  - `tests/integration/security-flows/` — End-to-end security gate chain: URL check → auth → content safety → approval → audit. Verify blocked URLs never reach browser. Verify write actions without approval are rejected.
- **E2E tests** (`tests/e2e/`):
  - Full workflow execution against mock target applications (Express servers mimicking ServiceNow, Jira responses). Verify the entire pipeline from HTTP request → security → dual-path routing → skill execution → response.

**Dependencies:** Phase 6

---

## Phase Dependencies

```
Phase 1 (Foundation) ──┬──► Phase 2 (App Package)
                       ├──► Phase 3 (Security) ──┐
                       ├──► Phase 4 (Browser) ───┼──► Phase 6 (Core Skills) ──► Phase 8 (Orchestrator) ──► Phase 9 (Server) ──┐
                       ├──► Phase 5 (API Layer) ─┘            │                                                               ├──► Phase 11 (CI/CD)
                       ├──► Phase 7 (Graph Skills)             └──► Phase 12 (Testing)                                        │
                       └──► Phase 10 (Bicep IaC) ─────────────────────────────────────────────────────────────────────────────┘
```

**Parallelizable after Phase 1:** Phases 2, 3, 4, 5, 7, 10

---

## Notes & Considerations

1. **TypeScript over Python** — Despite the Python .gitignore, all documentation code samples are TypeScript and the Azure AI Projects SDK is TypeScript-native. The .gitignore should be updated with Node.js patterns (`node_modules/`, `dist/`, `.env`).
2. **Playwright over Puppeteer** — Playwright has better cross-browser support, built-in auto-wait, and is a Microsoft project (natural fit for this Azure-integrated system).
3. **Environment variables** — All secrets via Azure Key Vault in production; `.env` for local development only. Never commit secrets.
4. **Dual-path routing** — The API-first, DOM-fallback pattern is a core architectural differentiator. `dual-path-router.ts` is the most architecturally critical file.
5. **Content Safety** — Every skill input/output must pass through Azure AI Content Safety. Non-negotiable per the architecture.
6. **Human-in-the-loop** — Write actions (`fill_form`, `submit_action`, `send_teams_message`, `manage_calendar`) must always request user approval. The approval gate integrates with the Copilot Chat UI.
7. **Audit trail** — Every single action must be logged to Cosmos DB with full provenance. No exceptions. 7-year retention for compliance.
8. **Icon assets** — Placeholder PNGs will be generated; production icons should be professionally designed.
