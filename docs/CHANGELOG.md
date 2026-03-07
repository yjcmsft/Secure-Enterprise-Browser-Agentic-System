# Changelog

All notable changes to the **Secure Enterprise Browser Agentic System** are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## 2026-03-06

### SEC EDGAR Bot-Detection Fallback (Dual-Path in Action)
- Added **`src/api/bot-detector.ts`** — detects bot-detection/CAPTCHA pages from SEC EDGAR, Cloudflare, reCAPTCHA, hCaptcha, and generic blocks. Returns structured `BotDetectionResult` with provider, reason, and suggested fallback path. Includes helpers: `isSecEdgarUrl()`, `extractCikFromUrl()`, `extractTickerFromUrl()`.
- Added **`src/api/sec-edgar-connector.ts`** — full SEC EDGAR XBRL API connector (`data.sec.gov`). Endpoints: `getCompanyFacts()`, `getCompanyConcept()`, `getSubmissions()`, `searchFilings()`, and high-level `extractFinancialSummary()`. Includes 15 pre-mapped ticker→CIK entries (AAPL, MSFT, GOOGL, AMZN, META, TSLA, NVDA, etc.) and 10 common XBRL financial concepts (Revenue, Net Income, Total Assets, EPS, etc.). SEC-compliant User-Agent header per fair access policy. Retry with backoff for 429/5xx.
- Updated **`src/skills/compare-data.ts`** with two-level fallback:
  1. **Proactive path** — SEC EDGAR URLs detected via `isSecEdgarUrl()` → skip browser entirely → call XBRL API.
  2. **Reactive path** — if DOM extraction returns a bot-detection page, `detectBotBlock()` triggers automatic SEC API fallback.
- Updated **`src/api/dual-path-router.ts`** — added "known API providers" registry so SEC EDGAR URLs proactively route to the API path without schema probing.
- Added `data.sec.gov` and `efts.sec.gov` to **`url-allowlist.txt`**.

### Frontend UI Enhancements
- Removed the "Compare Azure vs .NET docs" button and default compare routing.
- Added **SEC EDGAR compare button** (`compare_data (SEC)`) and **"Custom Ticker Compare"** quick action in the skills panel.
- SEC compare results now render as **formatted financial comparison tables**:
  - Side-by-side company columns with auto-formatted currency values ($394.33B, $96.99B).
  - Recent filings summary per company (form type + date).
  - Path badges (📡 API Path / 🔧 DOM Path).
  - Bot-detection and fallback indicators.
- Chat input smart routing: `compare AAPL vs MSFT` auto-routes to SEC EDGAR comparison with formatted table output.

### Tests Added
- **`tests/unit/api/bot-detector.test.ts`** — 32 tests: SEC EDGAR patterns (automated tool, equitable access, rate limit, filing block), Cloudflare challenge, CAPTCHA/reCAPTCHA/hCaptcha, generic denial, normal content pass-through, SEC URL matching, CIK extraction, ticker extraction.
- **`tests/unit/api/sec-edgar-connector.test.ts`** — 23 tests: CIK resolution (known tickers, numeric padding, unknown), API endpoints (companyfacts, companyconcept, submissions, search), financial summary extraction, retry logic (503, 429, timeout), non-retryable errors (404), User-Agent headers, empty facts handling.
- Updated **`tests/unit/api/dual-path-router.test.ts`** — 3 new tests for SEC EDGAR known-provider routing (www.sec.gov, data.sec.gov, edgar.sec.gov).

### Validation
- **54 test files, 456 tests, all passing**
- Typecheck clean, lint clean

---

## 2026-03-05

### Test Suite Expansion (47 → 398 tests)
- Grew test suite from **16 test files / 47 tests** to **52 test files / 398 tests** — a **745% increase** in test coverage.
- Achieved **92.88% statement coverage**, **87.62% branch coverage**, **94.85% function coverage**, **93.15% line coverage**.
- Browser module reached **100% coverage** across all metrics (browser-pool, dom-parser, element-selector, session-manager).

### New Unit Tests (36 files added)
- **AG-UI Handler**: `agui-handler.test.ts`, `agui-handler-full.test.ts` — SSE event lifecycle, state snapshots, error handling.
- **Foundry Agent**: `foundry-agent.test.ts`, `foundry-agent-full.test.ts`, `foundry-agent-lifecycle.test.ts` — agent lifecycle, tool execution, thread management.
- **Config & Runtime**: `config.test.ts`, `runtime.test.ts` — Zod validation, singleton initialization.
- **Fabric Module**: `fabric-analytics.test.ts`, `fabric-client.test.ts`, `fabric-client-enabled.test.ts`, `fabric-workiq.test.ts` — buffered streaming, pipeline triggers, ROI calculation, industry benchmarks.
- **Graph Module**: `graph-client.test.ts`, `graph-client-full.test.ts`, `graph-client-integration.test.ts`, `graph-adaptive-card.test.ts` — JWT permission validation, retry logic, Adaptive Card creation.
- **API Module**: `dual-path-router.test.ts`, `response-normalizer.test.ts` — routing decisions, response normalization.
- **Browser Module**: `browser-pool.test.ts`, `dom-parser.test.ts`, `element-selector.test.ts`, `session-manager.test.ts` — concurrency, DOM parsing, element selection, session TTL.
- **Orchestrator**: `memory-store.test.ts`, `task-planner-keywords.test.ts`, `tool-router.test.ts` — memory persistence, keyword planning paths, retry logic.
- **Security**: `approval-gate.test.ts`, `audit-logger-cosmos.test.ts`, `auth-delegation-full.test.ts`, `auth-delegation-kv.test.ts`, `content-safety-full.test.ts`, `content-safety-service.test.ts`, `errors.test.ts`, `security-gate.test.ts`, `security-gate-full.test.ts`, `security-gate-execute.test.ts` — full pipeline coverage, Key Vault integration, Content Safety service, error taxonomy.
- **Skills**: `compare-data.test.ts`, `compare-data-full.test.ts`, `graph-skills.test.ts`, `orchestrate-workflow.test.ts`, `registry.test.ts`, `skill-handlers.test.ts` — all 12 skills, isolated session comparison, workflow orchestration.

### New Integration Tests
- `tests/integration/security-flows/approval-gate.test.ts` — end-to-end approval gate flow.

### Microsoft Graph Module
- **`src/graph/client.ts`** — `withGraphClient()` wrapper with JWT permission validation (`scp` + `roles` claims), 3 retries with exponential backoff, `DefaultAzureCredential` with `graphAccessToken` override.
- **`src/graph/send-teams-message.ts`** — Teams messaging via Graph API (chat and channel modes), `Chat.ReadWrite` permission, SecurityGate integration.
- **`src/graph/manage-calendar.ts`** — Calendar CRUD operations (list top 20, create, update), dynamic permission scoping (`Calendars.Read` vs `Calendars.ReadWrite`).
- **`src/graph/create-adaptive-card.ts`** — Adaptive Card v1.5 builder (title TextBlock + body), returns structured JSON.
- **`src/graph/analyze-work-patterns.ts`** — Productivity analytics from Graph calendar data: meeting count, duration, back-to-back meetings, focus time recovered, context switches avoided, collaboration velocity.

### Microsoft Fabric Analytics Module
- **`src/fabric/client.ts`** — `FabricClient` REST wrapper: `loadTableRows()` (Lakehouse append), `triggerPipeline()` (Data Pipeline), `queryAnalytics()` (SQL endpoint). Azure Entra ID auth. Config via `FABRIC_WORKSPACE_ID`, `FABRIC_LAKEHOUSE_ID`, `FABRIC_PIPELINE_ID`, `FABRIC_ENABLED`.
- **`src/fabric/analytics.ts`** — `AnalyticsPipeline` with dual buffers (audit events + skill metrics). Auto-flush at 30-second intervals or 100-item threshold. Retry on failure (re-buffer). `triggerAnalytics()` pipeline trigger, `getSkillPerformance()` aggregation query.
- **`src/fabric/workiq.ts`** — `WorkIQConnector` productivity engine: manual time benchmarks for all 12 skills, `calculateTimeSaved()`, `recordWorkflowCompletion()`, `calculateROI()`, `getFoundryIQMetrics()`, `getIndustryBenchmark()` for 5 industries (financial_services, healthcare, manufacturing, retail, technology).

### Feature Flags System
- **`src/feature-flags.ts`** — 13 feature flags in 4 categories (Security, Browser, Analytics, Agent). File-based config via `feature-flags.txt` with `key=value` format.
- **`GET /api/features`** endpoint exposes all flags at runtime.
- Each security pipeline step is feature-flag gated — disable any layer independently without code changes.
- Flags: `url_allowlist`, `content_safety`, `approval_gate`, `pii_redaction`, `audit_logging`, `dual_path_routing`, `api_discovery`, `bot_detection_fallback`, `fabric_analytics`, `work_iq_metrics`, `agui_streaming`, `workflow_orchestration`, `screenshot_capture`.

### Security Enhancements
- **Content Safety**: Added name whitelist (50+ business/geographic terms) to prevent over-redaction of legitimate names in PII redaction pass.
- **Auth Delegation**: Full Azure Key Vault integration with `DefaultAzureCredential` fallback. Per-skill scope mapping for all 12 skills.
- **SecurityGate**: Feature-flag gating at every pipeline step — each layer (URL allowlist, content safety, approval, PII redaction, audit) can be independently toggled.
- **Audit Logger**: Cosmos DB persistent storage with in-memory fallback. Enriched `AuditLogEntry` with correlation fields (`requestId`, `conversationId`), error codes, and full action metadata.

### Frontend Interactive Demo
- **`frontend/index.html`** — Single-page chat UI (311 lines) with skills panel, click-to-run buttons, smart input routing (navigate/extract/compare/discover/health), workflow execution, screenshot display (base64 → `<img>`), status bar with health check.

### Server Improvements
- **Landing page**: Rich HTML landing page at `/` with 398 Tests Passing and 12 Skills badges, API endpoint documentation, quick test commands.
- **Rate limiting**: 100 requests/minute per IP via `express-rate-limit`.
- **Graceful shutdown**: Clean process termination with resource cleanup.

### Compare Data Skill
- Isolated sessions per URL (unique `sessionId` per comparison target) to prevent race conditions during parallel extraction via `Promise.all`.

### Scripts & Tooling
- **`scripts/customer-demo.ps1`** — Customer-facing demo script with 5 use cases: competitive intelligence, zero trust security, API discovery, multi-source comparison, request tracing.
- **`scripts/setup-azure-oidc.ps1`** / **`scripts/setup-azure-oidc.sh`** — GitHub Actions OIDC setup scripts (PowerShell + Bash). Creates app registration, service principal, role assignment, and federated credentials for staging/prod/main branches.

### Validation
- **52 test files, 398 tests, all passing**
- **92.88% statement coverage**
- Lint clean, typecheck clean

---

## 2026-02-28

### CI/CD — Real Deployment Pipelines
- Replaced placeholder `echo` steps in `.github/workflows/deploy.yml` with real `azd up` deployment:
  - **deploy-staging**: Azure login (OIDC), `azd` install, provision & deploy with staging env, post-deploy health-check smoke test.
  - **deploy-prod**: Same flow with `environment: production` gate, plus agent config package ZIP build.
  - Added `id-token: write` permissions for OIDC auth.
  - Added `npm run lint` and `npm run typecheck` to test job.
- Added `microsoft/security-devops-action@v1` security scan and `security-events: write` permission to `.github/workflows/test.yml`.

### Task Planner — Azure OpenAI Integration
- `src/orchestrator/task-planner.ts` now supports dual-mode planning:
  - **LLM mode** (when `AZURE_OPENAI_ENDPOINT` is configured): Sends prompt to Azure OpenAI GPT-4o with system instructions listing all 12 skills, parses JSON response into `WorkflowPlan`.
  - **Keyword mode** (default/fallback): Deterministic pattern matching expanded to cover all skill keywords (fill, screenshot, compare, discover, teams, calendar).
- `createPlan()` is now `async`; callers updated accordingly.

### Workflow Engine Resilience
- `orchestrateWorkflow` now wraps skill handler calls in try/catch — thrown errors (e.g., SecurityError) are recorded as failed step results instead of crashing the entire workflow.

### Tests Added/Expanded
- `tests/unit/security/content-safety.test.ts` — SSN/credit-card block, safe text allow, email/phone PII redaction (5 tests)
- `tests/unit/security/audit-logger.test.ts` — In-memory log storage, correlation fields, readiness probe (3 tests)
- `tests/unit/orchestrator/task-planner.test.ts` — All keyword paths, URL extraction, async fallback, unrecognized prompt (11 tests)
- `tests/integration/workflows/cross-skill-chain.test.ts` — Security-blocked navigate chain, fill with blocked URL, mixed chain stop-on-failure, empty steps (4 tests)
- `tests/e2e/smoke.test.ts` — Added fill/screenshot/compare and teams/calendar keyword tests (3 tests total)

### Validation
- **16 test files, 47 tests, all passing**
- Lint clean, typecheck clean

---

## 2026-02-27

### Security Hardening
- Hardened URL allowlist matching to parse and validate protocol, host, optional port, and path wildcard components instead of regex-matching raw URL strings.
- Added edge-case protection for deceptive lookalike hosts and invalid URL inputs.
- Added structured security error taxonomy with typed error codes:
  - `URL_NOT_ALLOWED`
  - `INPUT_BLOCKED`
  - `APPROVAL_DENIED`
  - `OUTPUT_BLOCKED`
- Ensured blocked/denied actions are always audit-logged with enriched metadata (`errorCode`, `deniedReason`, and failure payload).

### Workflow Safety
- Added defensive validation for orchestrated workflows:
  - Reject non-array `steps`.
  - Enforce maximum step count (`25`).
  - Fail fast on unknown skills.
  - Safely handle malformed step parameters.
- Improved write-skill behavior (`fill_form`, `submit_action`) for URL-optional DOM workflows and stronger parameter validation.

### API Reliability
- Added transient-only retry classification and bounded backoff with jitter to REST and GraphQL connectors.
- Added schema discovery cache TTL (5 minutes) with both positive and negative caching to reduce repeated network probing.

### Observability & Correlation
- Added end-to-end request correlation support:
  - Request ID resolution via `x-request-id` header, then body `requestId`, then server UUID.
  - Response header and response body include `requestId` across runtime endpoints.
  - Correlation fields (`requestId`, `conversationId`) propagate into security audit entries.
- Added API contract documentation and troubleshooting-by-`requestId` guidance in `README.md`.

### Tests Added/Expanded
- `tests/unit/security/url-allowlist.test.ts`
- `tests/integration/workflows/orchestrate-workflow.test.ts`
- `tests/unit/api/connectors.test.ts`
- `tests/unit/api/schema-discovery.test.ts`
- `tests/integration/security-flows/security-gate.test.ts`

### Validation
- Full validation suite passes:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
