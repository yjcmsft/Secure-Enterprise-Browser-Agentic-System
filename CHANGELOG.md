# Changelog

All notable changes to this project are documented in this file.

## 2026-03-07

### Azure Monitor OpenTelemetry
- Added `@azure/monitor-opentelemetry` + `@opentelemetry/api` — traces, metrics, and dependency tracking to Application Insights.
- Initialized `useAzureMonitor()` at app startup when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set.
- Added tracer spans to `/api/skills/:name` with attributes: `skill.name`, `user.id`, `session.id`, `skill.success`, `skill.path`, `skill.durationMs`.
- Exceptions recorded on span for failed skill executions.

### Dynamic CIK Resolution
- Added `resolveCikDynamic()` to `src/api/sec-edgar-connector.ts` — queries `https://www.sec.gov/files/company_tickers.json` and `efts.sec.gov/LATEST/search-index` for unknown tickers.
- `extractFinancialSummary()` now falls back to dynamic search for any ticker or company name (e.g., "Berkshire Hathaway").

### Multi-Tenant SaaS Support
- Added `src/security/tenant-manager.ts` — `TenantManager` class with per-tenant URL allowlists, Cosmos DB partition keys, feature toggles, concurrency limits.
- Added `tenant-config.json` — sample config with 3 tenants (Contoso Financial Services, Northwind Technology, Adventure Works Manufacturing).
- Added REST endpoints: `GET /api/tenants`, `GET /api/tenants/:id`, `GET /api/tenants/:id/check-url?url=...`.

### Security & Operational Improvements
- Added `SECURITY.md` — vulnerability disclosure policy, scope, safe harbor, response timeline.
- Added `CONTRIBUTING.md` — "Adding a New Skill" extensibility guide with 5-step walkthrough and code examples.
- Added `helmet` middleware for HTTP security headers (X-Content-Type-Options, X-Frame-Options, HSTS).
- CORS now configurable via `CORS_ALLOWED_ORIGINS` env var (default `*` for demo, restrict in production).
- Fixed landing page badge: 398 → 461 tests.
- Defaulted `fabric_analytics` and `work_iq_metrics` feature flags to `true`.

### Tests Added
- `tests/unit/copilot-sdk.test.ts` — 5 tests: session creation, BYOK config, 11-tool registration, system message, cleanup.
- `tests/e2e/server-smoke.test.ts` — 7 tests: real server start, `/health`, `/ready`, `/api/features`, `/api/workiq/*`, security gate, request correlation.

### Validation
- **56 test files, 461 tests, all passing**
- Typecheck clean, lint clean
- Staging deployed and verified: `/health` ✓, `/ready` ✓, `/api/workiq/benchmarks` ✓

## 2026-03-06

### AG-UI Local Demo Mode & Task Planner Improvements
- Added **AG-UI local demo mode** in `src/agui-handler.ts` — when Azure AI Foundry Agent Service is unavailable, the AG-UI streaming endpoint falls back to local execution using `TaskPlanner` + `ToolRouter`, streaming full AG-UI SSE events (`RUN_STARTED` → `TOOL_CALL_*` → `TEXT_MESSAGE_*` → `STATE_SNAPSHOT` → `RUN_FINISHED`) with real skill execution.
- Added `.env` file loading in `src/config.ts` via `loadDotEnv()` — reads `.env` into `process.env` at startup without external dependencies. Skipped during test runs (`NODE_ENV=test`) to preserve test isolation.
- Added `GET /demo` route in `src/index.ts` — serves `frontend/index.html` from the Express server at `http://localhost:3000/demo` (same-origin, avoids CORS issues for SSE error handling).
- Added "Open Interactive Demo UI" link button on the landing page.
- Improved `TaskPlanner.createPlanFromKeywords()` URL extraction:
  - Now matches multi-segment domains (e.g., `learn.microsoft.com` not just `microsoft.com`).
  - Detects `extract`, `title`, `content`, `text` keywords for extraction mode.
  - Auto-prepends `navigate_page` when `extract_content` is requested with a URL but no explicit navigate keyword.
  - Passes URL to `extract_content` params so it can create a browser session.
- Updated **frontend** with Workflow and AG-UI Stream buttons, SSE event rendering with color-coded event types, and improved error display for 503/400 responses.
- Updated `tests/unit/agui-handler-full.test.ts` — test now expects local demo mode (SSE stream) instead of 503 when Foundry is unavailable.

### SEC EDGAR Bot-Detection Fallback (Dual-Path in Action)
- Added `src/api/bot-detector.ts` — detects bot-detection/CAPTCHA pages from SEC EDGAR, Cloudflare, reCAPTCHA, hCaptcha, and generic blocks. Returns structured `BotDetectionResult` with provider, reason, and suggested fallback path. Includes helpers: `isSecEdgarUrl()`, `extractCikFromUrl()`, `extractTickerFromUrl()`.
- Added `src/api/sec-edgar-connector.ts` — full SEC EDGAR XBRL API connector (`data.sec.gov`). Endpoints: `getCompanyFacts()`, `getCompanyConcept()`, `getSubmissions()`, `searchFilings()`, and high-level `extractFinancialSummary()`. Includes 15 pre-mapped ticker→CIK entries and 10 common XBRL financial concepts (Revenue, Net Income, Total Assets, etc.). SEC-compliant User-Agent header per fair access policy.
- Updated `src/skills/compare-data.ts` with two-level fallback: (1) proactive SEC EDGAR API for known SEC URLs, (2) post-extraction bot-detection scanning with automatic API fallback when challenge page detected.
- Updated `src/api/dual-path-router.ts` — added "known API providers" registry; SEC EDGAR URLs now proactively route to the API path without schema probing.
- Added `data.sec.gov` and `efts.sec.gov` to `url-allowlist.txt`.

### Frontend UI Updates
- Removed the "Compare Azure vs .NET docs" button and default compare routing.
- Added SEC EDGAR compare button and "Custom Ticker Compare" quick action.
- SEC compare results now render as formatted financial comparison tables (side-by-side company columns, auto-formatted currency values, recent filings summary, path badges, bot-detection indicators) instead of raw JSON.
- Chat input `compare AAPL vs MSFT` auto-routes to SEC EDGAR comparison with formatted output.

### Tests Added
- `tests/unit/api/bot-detector.test.ts` — 32 tests covering all bot-detection patterns, SEC URL matching, CIK/ticker extraction.
- `tests/unit/api/sec-edgar-connector.test.ts` — 23 tests covering CIK resolution, all API endpoints, financial summary extraction, retry logic, error handling, User-Agent headers.
- Updated `tests/unit/api/dual-path-router.test.ts` — 3 new tests for SEC EDGAR known-provider routing.

### Validation
- **54 test files, 456 tests, all passing**
- Typecheck clean, lint clean

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
