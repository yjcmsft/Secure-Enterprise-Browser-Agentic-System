# Responsible AI Transparency Card

## System Overview

The **Secure Enterprise Browser Agentic System** is an AI-powered agent that navigates, reads, and acts across enterprise web applications on behalf of users. It uses Azure OpenAI GPT-4o for planning and generation, with 12 specialized skills for browser automation, data extraction, and enterprise communication.

**Intended use:** Automate repetitive multi-app workflows (financial analysis, incident response, stakeholder briefings) for enterprise employees with proper authorization.

**Not intended for:** Unsupervised decision-making, PII harvesting, bypassing access controls, or any action without human oversight for write operations.

---

## AI Safety Architecture

### 5-Layer Security Pipeline

Every request passes through all five layers sequentially. Each layer is independently toggleable via feature flags.

```
Request
  → Layer 1: Azure Entra ID (authentication + RBAC)
  → Layer 2: URL Allowlist (only pre-approved domains)
  → Layer 3: Azure AI Content Safety (input screening)
  → Layer 4: Approval Gate (human-in-the-loop for writes)
  → Layer 5: Content Safety + PII Redaction (output screening)
  → Audit Log (immutable Cosmos DB trail)
  → Response
```

### Human Oversight

| Action Type | Approval Required | Rationale |
|---|---|---|
| **Read** (`navigate_page`, `extract_content`, `discover_apis`, `capture_screenshot`, `compare_data`, `analyze_work_patterns`) | No | Read-only operations pose no risk of unintended changes |
| **Write** (`fill_form`, `submit_action`) | **Yes** | Form fills and submissions can modify enterprise data |
| **Communicate** (`send_teams_message`, `manage_calendar`) | **Yes** | Messages sent on behalf of users require explicit consent |
| **Display** (`create_adaptive_card`) | No | Card creation is local — no external action taken |

Write/communicate skills are blocked until a human approves via `POST /api/approve/:id`. Approval timeout defaults to 5 minutes (`APPROVAL_TIMEOUT_MS=300000`).

---

## Content Safety

### Azure AI Content Safety Integration

- **Input screening:** All user prompts are screened before reaching the LLM
- **Output screening:** All agent responses are screened before delivery to the user
- **Block threshold:** Configurable via `CONTENT_SAFETY_BLOCK_THRESHOLD` (default: 4 on a 1–7 severity scale)
- **Fallback:** When Azure AI Content Safety is unavailable, a local pattern-matching fallback activates

### PII Protection

| PII Type | Action | Implementation |
|---|---|---|
| **SSN** (xxx-xx-xxxx) | **Blocked** | Regex detection → request rejected |
| **Credit card numbers** | **Blocked** | Luhn-pattern detection → request rejected |
| **Email addresses** | **Redacted** | Replaced with `[EMAIL REDACTED]` in output |
| **Phone numbers** | **Redacted** | Replaced with `[PHONE REDACTED]` in output |
| **Name-like patterns** | **Whitelist-protected** | 50+ business/geographic terms (e.g., "Microsoft", "Azure", "California") are exempt from over-redaction |

### URL Allowlist

- Only pre-approved domains can be accessed (configured via `url-allowlist.txt`)
- Parsed and validated by protocol, host, optional port, and path wildcards
- Edge-case protection against deceptive lookalike hosts (e.g., `sec.gov.evil.com`)
- Disabled via `enabled=false` in the file or `url_allowlist=false` feature flag

---

## Bias Testing & Mitigation

### Model Selection

- **GPT-4o** is used for task planning and agent orchestration
- The model is accessed via Azure OpenAI Service with enterprise data protection guarantees
- No user data is used for model fine-tuning (standard Azure OpenAI data processing agreement)

### Testing Approach

| Test Category | Coverage | Method |
|---|---|---|
| **URL handling** | Deceptive domains, lookalike hosts, international domains | Unit tests (`url-allowlist.test.ts`) |
| **Content safety** | SSN blocking, credit card detection, PII redaction, safe text passthrough | Unit tests (`content-safety.test.ts`, `content-safety-full.test.ts`) |
| **Approval enforcement** | Write skill blocking, timeout behavior, approval resolution | Integration tests (`approval-gate.test.ts`) |
| **Bot detection** | SEC EDGAR, Cloudflare, CAPTCHA, generic denial patterns | Unit tests (`bot-detector.test.ts` — 32 tests) |
| **Cross-skill security** | Blocked URL in workflow, approval timeout in chains, mixed chain failure | Integration tests (`cross-skill-chain.test.ts`) |
| **Error handling** | Security error taxonomy, HTTP status mapping, audit logging of denials | Unit tests (`errors.test.ts`, `security-gate.test.ts`) |

**Total security-related tests:** 60+ tests across 14 test files

### Fairness Considerations

- The agent operates on behalf of authenticated users with their existing permissions (Entra ID RBAC)
- No user profiling, scoring, or automated decision-making that affects individuals
- No demographic data collection or processing
- Industry benchmarks in Work IQ are aggregate projections, clearly labeled as estimates

---

## Audit Trail

Every agent action is logged to an immutable Cosmos DB audit trail with:

| Field | Description |
|---|---|
| `userId` | Authenticated user who initiated the action |
| `skill` | Which of the 12 skills was invoked |
| `params` | Parameters passed to the skill |
| `result` | Success/failure outcome |
| `durationMs` | Execution time |
| `path` | API or DOM path used |
| `approvalStatus` | Whether approval was requested/granted/denied |
| `errorCode` | Security error code if blocked |
| `requestId` | Correlation ID for end-to-end tracing |
| `conversationId` | Session correlation for multi-turn tracking |
| `timestamp` | ISO 8601 timestamp |

Audit logs are:
- **Immutable** — append-only Cosmos DB collection
- **Correlated** — `requestId` links logs across security layers, Application Insights, and API responses
- **Comprehensive** — both successful and denied/blocked actions are logged

---

## Limitations & Known Risks

| Risk | Mitigation | Residual Risk |
|---|---|---|
| **LLM hallucination** | Structured skill execution (not freeform generation), factual data from APIs | Low — agent acts on structured data, not generated text |
| **Wrong element clicked** | Dual-path strategy prefers API calls; DOM fallback uses specific selectors | Low — 95% error reduction with API-first path |
| **Unauthorized access** | Entra ID + URL allowlist + per-skill token scoping | Very low — defense-in-depth with 5 independent layers |
| **PII leakage** | Content Safety screening + PII redaction + name whitelist | Low — automated redaction with manual override via feature flags |
| **Bot detection evasion** | Respects site policies; SEC EDGAR accessed via official XBRL API with compliant User-Agent | None — uses official APIs, not circumvention |
| **Approval bypass** | Approval gate is enforced at the security pipeline level, not at the skill level | Very low — bypassing requires modifying server code |

---

## Compliance Alignment

| Standard | How This System Aligns |
|---|---|
| **SOC 2** | Immutable audit trail, access controls, encryption at rest/in transit |
| **ISO 27001** | Defense-in-depth security layers, key management via Key Vault |
| **GDPR** | PII auto-redaction, data residency via Azure region selection, audit trail |
| **HIPAA** | Content Safety screening, human approval for writes, audit logging (with BAA in place) |
| **Microsoft Responsible AI Standard** | Content Safety integration, human oversight, transparency (this document) |
| **NIST AI RMF** | Risk identification (this section), testing & evaluation (456 tests), governance (feature flags + audit) |

---

## Contact & Feedback

- **Repository:** [github.com/yjcmsft/Secure-Enterprise-Browser-Agentic-System](https://github.com/yjcmsft/Secure-Enterprise-Browser-Agentic-System)
- **Responsible AI questions:** File an issue with the `responsible-ai` label
- **Security vulnerabilities:** See [SECURITY.md](./SECURITY.md) for responsible disclosure guidelines
