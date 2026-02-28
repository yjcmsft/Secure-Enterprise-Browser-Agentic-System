# Changelog

All notable changes to this project are documented in this file.

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
  - **deploy-prod**: Same flow with `environment: production` gate, plus M365 app package ZIP build.
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
