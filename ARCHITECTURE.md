# Secure Enterprise Browser Agentic System — Architecture

## System Diagram

```mermaid
flowchart TB
    subgraph UserLayer["👤 User Layer"]
        Employee["Employee"]
        CopilotChat["Copilot Chat / CLI Interface\n(Teams / Outlook / Web)"]
    end

    subgraph AzureInfra["☁️ Azure Cloud Infrastructure"]
        AOAI["Azure OpenAI Service\n(GPT-4o)"]
        EntraID["Azure Entra ID\n(SSO + RBAC +\nConditional Access)"]
        ContainerApps["Azure Container Apps\n(Agent Runtime)"]
        KeyVault["Azure Key Vault\n(Secrets + Certs)"]
        CosmosDB["Azure Cosmos DB\n(Audit Logs + State)"]
        AppInsights["Application Insights\n(Distributed Tracing)"]
        AzMonitor["Azure Monitor\n(Alerts + Dashboards)"]
        ContentSafety["Azure AI Content Safety\n(PII + Jailbreak Defense)"]
    end

    subgraph AgentOrchestrator["🤖 Agent Orchestrator (Copilot SDK)"]
        Planner["Task Planner\n(Multi-step Workflow Engine)"]
        Memory["Context & Memory Store"]
        Router["Tool Router"]
    end

    subgraph SecurityLayer["🔒 Security Boundary Layer"]
        AuthDelegation["Auth Delegation\n(Entra ID SSO / Token Proxy)"]
        URLAllowlist["URL Allowlisting\n(Domain & Path Rules)"]
        ApprovalGate["Action Approval Gate\n(Human-in-the-Loop)"]
        AuditLog["Audit Log →\nCosmos DB"]
    end

    subgraph ToolLayer["🛠️ Agent Skills"]
        Navigate["navigate_page\n(URL navigation,\nclick, scroll)"]
        Extract["extract_content\n(Read & summarize\npage data)"]
        FillForm["fill_form\n(Input fields,\ndropdowns, dates)"]
        Submit["submit_action\n(Buttons, approvals,\nstate transitions)"]
        GraphSkills["Microsoft Graph\n(Teams, Outlook,\nCalendar, Files)"]
    end

    subgraph APILayer["📡 Native API Integration Layer"]
        APIConnectors["API Connectors\n(REST / GraphQL\nDirect Integration)"]
        SchemaDiscovery["API Schema Discovery\n(OpenAPI / Swagger\nEndpoint Detection)"]
        ResponseNorm["Response Normalizer\n(Structured Data\nTransformation)"]
    end

    subgraph BrowserEngine["🌐 Browser Automation (J-browser-agents)"]
        Headless["Headless Browser\nInstance Pool"]
        DOMParser["DOM Parser &\nElement Selector"]
        SessionMgr["Session & Cookie\nManager"]
    end

    subgraph IntelligenceLayer["🧠 Microsoft Intelligence"]
        Foundry["Microsoft Foundry\n(Agent Orchestration)"]
        Fabric["Microsoft Fabric\n(Data Analytics +\nWorkflow Intelligence)"]
        WorkIQ["Work IQ\n(Productivity Insights +\nViva Integration)"]
    end

    subgraph TargetApps["🏢 Target Web Applications"]
        subgraph InternalApps["Internal Enterprise Apps"]
            ServiceNow["ServiceNow\n(ITSM / Tickets)"]
            Jira["Jira\n(Project Tracking)"]
            Dashboards["Internal Dashboards\n(Analytics / Reports)"]
        end
        subgraph PublicApps["Public / External Sites"]
            InvestorPages["Investor Relations\n(Annual Reports, SEC)"]
            ECommerce["E-Commerce\n(Procurement)"]
            TravelBooking["Travel Portals\n(Booking / Expenses)"]
        end
    end

    %% User → Azure → Agent
    Employee -->|"Natural language request"| CopilotChat
    CopilotChat -->|"Parsed intent"| AOAI
    AOAI -->|"Planned tasks"| Planner
    Planner <-->|"State tracking"| Memory
    Planner -->|"Tool calls"| Router
    ContainerApps -.->|"Hosts runtime"| AgentOrchestrator

    %% Azure services
    EntraID -->|"Auth tokens"| AuthDelegation
    KeyVault -->|"Secrets"| AuthDelegation
    ContentSafety -->|"Input/output screening"| SecurityLayer
    AuditLog -->|"Write logs"| CosmosDB
    AppInsights -.->|"Trace spans"| AgentOrchestrator
    AppInsights --> AzMonitor
    CosmosDB -->|"Change feed"| Fabric

    %% Router → Tools
    Router -->|"Route to skill"| Navigate
    Router -->|"Route to skill"| Extract
    Router -->|"Route to skill"| FillForm
    Router -->|"Route to skill"| Submit
    Router -->|"Route to skill"| GraphSkills

    %% Tools → Security
    Navigate & Extract & FillForm & Submit -->|"All actions pass through"| SecurityLayer

    %% Security → API / Browser
    AuthDelegation -->|"Inject auth tokens"| Headless
    URLAllowlist -->|"Validate target URL"| Headless
    ApprovalGate -->|"Request user confirmation\n(destructive actions)"| Employee
    ApprovalGate -->|"Approved action"| Headless
    AuditLog -.->|"Log every action"| SecurityLayer

    %% API integration
    SecurityLayer -->|"Prefer API path\nwhen available"| APILayer
    SecurityLayer -->|"Fallback: DOM automation"| Headless
    SchemaDiscovery -->|"Discover available\nAPI endpoints"| Planner
    APIConnectors -->|"REST/GraphQL calls"| SessionMgr
    ResponseNorm -->|"Structured responses"| Planner

    %% Browser internals
    Headless <--> DOMParser
    Headless <--> SessionMgr

    %% Browser → Target apps
    Headless -->|"HTTP/S"| ServiceNow
    Headless -->|"HTTP/S"| Jira
    Headless -->|"HTTP/S"| Dashboards
    Headless -->|"HTTP/S"| InvestorPages
    Headless -->|"HTTP/S"| ECommerce
    Headless -->|"HTTP/S"| TravelBooking

    %% Intelligence layer
    Planner <-->|"Agent handoff"| Foundry
    Fabric -->|"Workflow insights"| Planner
    AppInsights -->|"Productivity signals"| WorkIQ
    WorkIQ -->|"Efficiency metrics"| Fabric

    %% Results back to agent
    Extract -->|"Structured data /\nsummarized content"| Planner
    Submit -->|"Action result"| Planner
    Planner -->|"Final response"| CopilotChat
    CopilotChat -->|"Answer / confirmation"| Employee

    %% Styling
    classDef userStyle fill:#E3F2FD,stroke:#1565C0,color:#0D47A1
    classDef azureStyle fill:#E8EAF6,stroke:#283593,color:#1A237E
    classDef agentStyle fill:#F3E5F5,stroke:#7B1FA2,color:#4A148C
    classDef securityStyle fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef toolStyle fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef apiStyle fill:#E8EAF6,stroke:#283593,color:#1A237E
    classDef browserStyle fill:#FFF3E0,stroke:#E65100,color:#BF360C
    classDef intelStyle fill:#FCE4EC,stroke:#AD1457,color:#880E4F
    classDef internalStyle fill:#F1F8E9,stroke:#558B2F,color:#33691E
    classDef publicStyle fill:#FFF8E1,stroke:#F9A825,color:#F57F17

    class Employee,CopilotChat userStyle
    class AOAI,EntraID,ContainerApps,KeyVault,CosmosDB,AppInsights,AzMonitor,ContentSafety azureStyle
    class Planner,Memory,Router agentStyle
    class AuthDelegation,URLAllowlist,ApprovalGate,AuditLog securityStyle
    class Navigate,Extract,FillForm,Submit,GraphSkills toolStyle
    class APIConnectors,SchemaDiscovery,ResponseNorm apiStyle
    class Headless,DOMParser,SessionMgr browserStyle
    class Foundry,Fabric,WorkIQ intelStyle
    class ServiceNow,Jira,Dashboards internalStyle
    class InvestorPages,ECommerce,TravelBooking publicStyle
```

## Layer Descriptions

| Layer | Purpose |
|---|---|
| **User Layer** | Employee interacts via natural language through Copilot Chat (Teams / Outlook / Web) |
| **Azure Cloud Infrastructure** | Azure OpenAI (GPT-4o), Entra ID (SSO + RBAC), Container Apps (runtime), Key Vault (secrets), Cosmos DB (audit), Monitor + App Insights (observability), AI Content Safety (RAI) |
| **Agent Orchestrator** | Copilot SDK plans multi-step workflows, tracks context, and routes tool calls |
| **Security Boundary** | Azure Entra ID auth delegation, URL allowlisting, human-in-the-loop approval gates, Azure AI Content Safety screening, and Cosmos DB audit logging |
| **Agent Skills** | Core skills — `navigate_page`, `extract_content`, `fill_form`, `submit_action`, plus Microsoft Graph skills for Teams/Outlook |
| **Native API Integration** | Direct REST/GraphQL integration with target applications — the agent discovers and calls native APIs (OpenAPI/Swagger) exposed by enterprise apps, enabling faster and more reliable workflows than DOM manipulation |
| **Browser Automation** | J-browser-agents manages headless browser instances, DOM parsing, and session/cookie handling |
| **Microsoft Intelligence** | Microsoft Foundry for agent orchestration at scale; Microsoft Fabric for operational analytics and workflow intelligence; **Work IQ** for productivity measurement (time saved, focus hours, collaboration velocity) via Viva Insights |
| **Target Apps** | Internal enterprise apps (ServiceNow, Jira, dashboards) and public/external sites (investor pages, e-commerce, travel portals) |

## Native API Integration

```mermaid
flowchart LR
    subgraph DOMPath["🔧 DOM Automation Path (Fallback)"]
        direction TB
        T1["Agent Tool Call"] --> T2["DOM Inspection"]
        T2 --> T3["CSS/XPath Selectors"]
        T3 --> T4["Click / Fill / Submit"]
        T4 --> T5["Parse Response DOM"]
    end

    subgraph APIPath["📡 Native API Path (Preferred)"]
        direction TB
        W1["Agent Tool Call"] --> W2["Discover APIs\n(OpenAPI / Swagger)"]
        W2 --> W3{"REST or\nGraphQL?"}
        W3 -->|"CRUD operations"| W4["REST API\n(HTTP methods)"]
        W3 -->|"Complex queries"| W5["GraphQL API\n(Flexible queries)"]
        W4 --> W6["Structured Response"]
        W5 --> W6
    end

    Agent["🤖 Agent"] --> DOMPath
    Agent --> APIPath

    style APIPath fill:#E8EAF6,stroke:#283593
    style DOMPath fill:#FFF3E0,stroke:#E65100
```

> **Why Native API Integration matters:** Enterprise applications like ServiceNow, Jira, Workday, and Grafana all expose mature REST/GraphQL APIs. By calling these APIs directly, the agent skips brittle DOM scraping and gets structured responses immediately. This is faster, more reliable, and works independently of UI changes — the API contract defines exactly what actions are available and how to invoke them.

## Security Flow

```mermaid
sequenceDiagram
    participant E as Employee
    participant A as Agent
    participant S as Security Layer
    participant B as Browser
    participant W as Web App

    E->>A: "Close ticket SNOW-1234"
    A->>S: navigate_page(servicenow.corp/SNOW-1234)
    S->>S: ✅ URL in allowlist
    S->>S: ✅ Inject SSO token
    S->>B: Navigate with auth
    B->>W: GET /SNOW-1234
    W-->>B: Page content
    B-->>A: DOM extracted

    A->>S: submit_action(close_ticket)
    S->>S: ⚠️ Destructive action detected
    S->>E: "Approve closing SNOW-1234?"
    E->>S: ✅ Approved
    S->>B: Execute close
    B->>W: POST /close
    W-->>B: Success
    B-->>A: Action complete
    A-->>E: "Ticket SNOW-1234 closed ✅"
    S-->>S: 📝 Audit log recorded
```

---

## Example 1 — Extract Financial Data from Microsoft Investor Relations

**Scenario:** An analyst asks: _"Go to the Microsoft investor relations page, open the 2024 annual report, and pull the SUMMARY RESULTS OF OPERATIONS table."_

```mermaid
sequenceDiagram
    participant U as Analyst
    participant A as Agent (Copilot SDK)
    participant S as Security Layer
    participant B as Browser (J-browser-agents)
    participant IR as microsoft.com/investor

    U->>A: "Pull SUMMARY RESULTS OF OPERATIONS<br/>from MSFT 2024 annual report"

    Note over A: Step 1 — Navigate to IR page
    A->>S: navigate_page("microsoft.com/investor")
    S->>S: ✅ URL allowed (public site)
    S->>B: Navigate
    B->>IR: GET /investor
    IR-->>B: Investor Relations landing page
    B-->>A: Page loaded

    Note over A: Step 2 — Find and click annual report link
    A->>B: extract_content(find "2024 Annual Report" link)
    B-->>A: Found link → /investor/reports/ar24/
    A->>S: navigate_page("microsoft.com/investor/reports/ar24/")
    S->>B: Navigate
    B->>IR: GET /investor/reports/ar24/
    IR-->>B: Annual report page (full HTML)
    B-->>A: Page loaded

    Note over A: Step 3 — Locate and extract table
    A->>B: extract_content(find "SUMMARY RESULTS<br/>OF OPERATIONS" table)
    B->>B: Parse DOM for table element
    B-->>A: Structured table data extracted

    Note over A: Step 4 — Return formatted results
    A-->>U: Here is the table:

    Note right of U: | Metric | FY2024 | FY2023 | Change |<br/>|---|---|---|---|<br/>| Revenue | $245.1B | $211.9B | +16% |<br/>| Gross margin | $171.0B | $146.1B | +17% |<br/>| Operating income | $109.4B | $88.5B | +24% |<br/>| Net income | $88.1B | $72.4B | +22% |<br/>| Diluted EPS | $11.80 | $9.68 | +22% |
```

### Expected Extracted Output

| (In millions, except per share) | FY 2024 | FY 2023 | % Change |
|---|---|---|---|
| **Revenue** | $245,122 | $211,915 | 16% |
| **Gross margin** | $171,008 | $146,052 | 17% |
| **Operating income** | $109,433 | $88,523 | 24% |
| **Net income** | $88,136 | $72,361 | 22% |
| **Diluted EPS** | $11.80 | $9.68 | 22% |

---

## Example 2 — Cross-App Incident Resolution (ServiceNow + Jira + Dashboard)

**Scenario:** A site reliability engineer asks: _"There's a P1 incident in ServiceNow INC0042. Link it to the related Jira bug, pull the error rate from our monitoring dashboard, and add it to the incident notes."_

```mermaid
sequenceDiagram
    participant E as SRE
    participant A as Agent
    participant S as Security
    participant B as Browser
    participant SN as ServiceNow
    participant J as Jira
    participant D as Grafana Dashboard

    E->>A: "Link INC0042 to Jira bug,<br/>pull error rate, update notes"

    Note over A: Step 1 — Read incident details
    A->>S: navigate_page(servicenow.corp/INC0042)
    S->>S: ✅ Allowlisted + SSO injected
    S->>B: Navigate
    B->>SN: GET /INC0042
    SN-->>B: Incident details (P1, payment-service)
    B-->>A: Extracted: P1, payment-service-timeout

    Note over A: Step 2 — Search Jira for related bug
    A->>S: navigate_page(jira.corp/search?q=payment-service-timeout)
    S->>B: Navigate
    B->>J: GET /search
    J-->>B: Search results
    B-->>A: Found: BUG-7891 "Payment timeout in EU region"

    Note over A: Step 3 — Pull error rate from dashboard
    A->>S: navigate_page(grafana.corp/d/payments?last=1h)
    S->>B: Navigate
    B->>D: GET /d/payments
    D-->>B: Dashboard with charts
    B-->>A: Error rate: 12.4% (last 1h), p99 latency: 8.2s

    Note over A: Step 4 — Update ServiceNow with findings
    A->>S: fill_form(INC0042/notes, compiled_data)
    S->>S: ⚠️ Write action — approval needed
    S->>E: "Update INC0042 notes with Jira link + error rate?"
    E->>S: ✅ Approved
    S->>B: Submit
    B->>SN: POST /INC0042/update
    SN-->>B: Updated
    B-->>A: Success

    A-->>E: "Done ✅ INC0042 updated with:<br/>• Linked to BUG-7891<br/>• Error rate: 12.4%<br/>• p99 latency: 8.2s"
```

---

## Example 3 — Multi-Step Travel Booking with Native API Integration

**Scenario:** An employee asks: _"Book me the cheapest direct flight from Seattle to New York on March 15, and submit for manager approval."_

This example showcases the **Native API Integration** — the agent discovers the travel portal's REST API via its OpenAPI spec, then uses direct API calls for search, filtering, and booking.

```mermaid
sequenceDiagram
    participant E as Employee
    participant A as Agent
    participant S as Security
    participant API as API Integration Layer
    participant T as Corporate Travel Portal

    E->>A: "Book cheapest direct SEA→JFK,<br/>March 15, submit for approval"

    Note over A: Step 1 — Discover site APIs
    A->>API: discover_apis(travel.corp)
    API->>T: GET /api/openapi.json
    T-->>API: OpenAPI specification
    API-->>A: Available endpoints:<br/>• GET /api/flights/search<br/>• GET /api/flights/{id}<br/>• POST /api/bookings<br/>• GET /api/bookings/{id}

    Note over A: Step 2 — Search flights via REST API
    A->>API: GET /api/flights/search?from=SEA&to=JFK<br/>&date=2026-03-15&direct=true
    API->>T: REST API call (direct HTTP)
    T-->>API: 8 results (JSON)
    API-->>A: Flight results (structured JSON)

    Note over A: Step 3 — Sort results (client-side)
    A->>A: Sort by price ascending
    A->>A: Cheapest: Alaska AS204, $189, departs 6:15 AM

    Note over A: Step 4 — Book via REST API
    A->>S: POST /api/bookings (flight:AS204)
    S->>S: ⚠️ Financial action — approval needed
    S->>E: "Book Alaska AS204 SEA→JFK $189?"
    E->>S: ✅ Approved
    S->>API: POST /api/bookings {flight:AS204, approval:manager}
    API->>T: REST API call
    T-->>API: Booking submitted for manager approval
    API-->>A: Confirmation #TRV-29481

    A-->>E: "✅ Booked Alaska AS204 ($189)<br/>SEA→JFK Mar 15, 6:15 AM<br/>Pending manager approval<br/>Confirmation: TRV-29481"
```

---

## Example 4 — Competitive Intelligence Report from Public SEC Filings

**Scenario:** A strategy analyst asks: _"Compare revenue and operating income for MSFT, GOOGL, and AMZN from their latest annual reports. Build a comparison table."_

```mermaid
sequenceDiagram
    participant U as Analyst
    participant A as Agent
    participant B as Browser
    participant M as MSFT IR
    participant G as GOOGL IR
    participant Z as AMZN IR

    U->>A: "Compare MSFT, GOOGL, AMZN<br/>revenue & operating income<br/>from latest annual reports"

    par Navigate to all three IR pages
        A->>B: navigate_page(microsoft.com/investor/reports/ar24)
        B->>M: GET annual report
        M-->>B: MSFT financial data
    and
        A->>B: navigate_page(abc.xyz/investor)
        B->>G: GET annual report
        G-->>B: GOOGL financial data
    and
        A->>B: navigate_page(ir.aboutamazon.com/annual-reports)
        B->>Z: GET annual report
        Z-->>B: AMZN financial data
    end

    B-->>A: All three pages loaded

    par Extract financial tables
        A->>B: extract_content(MSFT summary results table)
        B-->>A: MSFT: Rev $245.1B, OI $109.4B
    and
        A->>B: extract_content(GOOGL income statement)
        B-->>A: GOOGL: Rev $307.4B, OI $94.2B
    and
        A->>B: extract_content(AMZN income statement)
        B-->>A: AMZN: Rev $574.8B, OI $36.9B
    end

    Note over A: Compile comparison table
    A-->>U: Comparison table:

    Note right of U: | Company | Revenue | Op. Income | Margin |<br/>|---|---|---|---|<br/>| MSFT | $245.1B | $109.4B | 44.6% |<br/>| GOOGL | $307.4B | $94.2B | 30.6% |<br/>| AMZN | $574.8B | $36.9B | 6.4% |
```

---

## Example 5 — HR Onboarding Workflow Across Multiple Internal Portals

**Scenario:** An HR coordinator asks: _"New hire Jane Doe starts Monday. Create her accounts in Workday, provision Jira access for the Platform team, and assign ServiceNow onboarding tasks."_

```mermaid
sequenceDiagram
    participant HR as HR Coordinator
    participant A as Agent
    participant S as Security
    participant B as Browser
    participant WD as Workday
    participant J as Jira Admin
    participant SN as ServiceNow

    HR->>A: "Onboard Jane Doe — Workday,<br/>Jira (Platform team), ServiceNow tasks"

    Note over A: Step 1 — Create Workday profile
    A->>S: navigate_page(workday.corp/new-hire)
    S->>S: ✅ HR role authorized
    S->>B: Navigate
    B->>WD: GET /new-hire
    A->>S: fill_form(name, dept, start_date, manager)
    S->>S: ⚠️ PII action — approval needed
    S->>HR: "Create Workday profile for Jane Doe?"
    HR->>S: ✅ Approved
    S->>B: Submit form
    B->>WD: POST /new-hire
    WD-->>B: Employee ID: EMP-20487
    B-->>A: Profile created

    Note over A: Step 2 — Provision Jira access
    A->>S: navigate_page(jira.corp/admin/users)
    S->>B: Navigate
    B->>J: GET /admin/users
    A->>S: fill_form(add_user: jane.doe, team: Platform)
    S->>HR: "Add jane.doe to Platform team in Jira?"
    HR->>S: ✅ Approved
    S->>B: Submit
    B->>J: POST /admin/users
    J-->>B: User added
    B-->>A: Jira access provisioned

    Note over A: Step 3 — Create ServiceNow onboarding tasks
    A->>S: navigate_page(servicenow.corp/onboarding)
    S->>B: Navigate
    B->>SN: GET /onboarding
    A->>S: submit_action(create_tasks, template: engineering)
    S->>HR: "Create onboarding checklist for Jane Doe?"
    HR->>S: ✅ Approved
    S->>B: Submit
    B->>SN: POST /onboarding/create
    SN-->>B: 12 tasks created
    B-->>A: Onboarding tasks ready

    A-->>HR: "✅ Jane Doe onboarding complete:<br/>• Workday: EMP-20487<br/>• Jira: Platform team access<br/>• ServiceNow: 12 onboarding tasks assigned"
```

---

## Related Files

- **[README.md](./README.md)** — Executive summary, "Operation Skyfall" demo scenario, Azure integration overview, ROI metrics, Copilot SDK feedback, customer validation
- **[agents.md](./agents.md)** — Agent types, M365 Copilot app packaging, declarative agent manifest, Foundry integration, and API integration strategy
- **[skills.md](./skills.md)** — Detailed skill definitions (`navigate_page`, `extract_content`, `fill_form`, `submit_action`, `discover_apis`, `compare_data`, Microsoft Graph skills), API plugin spec, Azure AI Content Safety integration, and security classifications

---

## Azure Cloud Infrastructure

### Azure OpenAI Service

The agent uses **Azure OpenAI Service (GPT-4o)** as its foundation model for:
- **Task planning** — Decomposing natural language requests into multi-step skill invocation plans
- **Intent recognition** — Mapping user prompts to the correct skills and parameters
- **Response generation** — Synthesizing extracted data into human-readable summaries, tables, and executive briefs
- **Error recovery** — When a skill fails, the model reasons about alternative approaches (e.g., switch from API to DOM path)

### Azure Entra ID

All authentication flows use **Azure Entra ID** with:
- **SSO delegation** — Agent authenticates to target applications using the user's existing SSO session
- **Conditional Access** — Policies enforce device compliance, location restrictions, and MFA requirements
- **RBAC** — Fine-grained role-based access control determines which skills each user can invoke
- **Token scoping** — Tokens are scoped per-application with minimum required permissions

### Azure Container Apps

The agent runtime is hosted on **Azure Container Apps** for:
- **Auto-scaling** — Scales from 0 to N instances based on request volume (KEDA-driven)
- **Revision management** — Blue/green deployments with instant rollback
- **Managed identity** — No credentials in code; authenticates to Azure services via managed identity
- **VNet integration** — Runs inside the corporate VNet for access to internal applications

### Azure Key Vault

All secrets are managed through **Azure Key Vault**:
- SSO tokens and refresh tokens
- API keys for third-party integrations
- Browser session encryption keys
- TLS certificates for internal communication

### Azure Cosmos DB

**Azure Cosmos DB** stores:
- **Immutable audit logs** — Every agent action is logged with timestamp, user, skill, parameters, and result
- **Workflow state** — Multi-step workflow progress and conversation memory
- **Change feed** — Streams audit data to Microsoft Fabric for analytics

### Observability Stack

```mermaid
flowchart LR
    Agent["🤖 Agent Runtime"] -->|"Trace spans"| AppInsights["Application Insights"]
    Agent -->|"Custom metrics"| AppInsights
    Agent -->|"Structured logs"| AppInsights
    AppInsights -->|"Alerts"| AzMonitor["Azure Monitor"]
    AppInsights -->|"Dashboards"| Workbooks["Azure Workbooks"]
    AzMonitor -->|"Notify"| Teams["Teams Channel\n(#agent-alerts)"]
    Agent -->|"Audit events"| CosmosDB["Cosmos DB"]
    CosmosDB -->|"Change feed"| Fabric["Microsoft Fabric"]
    Fabric -->|"Visualize"| PowerBI["Power BI\nDashboard"]

    classDef monitoring fill:#E8EAF6,stroke:#283593
    class AppInsights,AzMonitor,Workbooks,CosmosDB,Fabric,PowerBI monitoring
```

**Application Insights** provides:
- **Distributed tracing** — End-to-end trace from user prompt → Copilot SDK → security gate → browser/API → target app → response
- **Custom metrics** — Skill invocation counts, API vs. DOM path ratio, approval rates, response times
- **Live metrics** — Real-time dashboard showing active sessions, error rate, and throughput
- **Failure analysis** — Automatic detection of skill failures with root cause analysis

**Azure Monitor** provides:
- **Alert rules** — Triggers on error rate > 1%, response time > 10s, approval timeout, Content Safety blocks
- **Action groups** — Sends alerts to Teams channel, email, and PagerDuty
- **SLA tracking** — Custom dashboards tracking agent availability and performance SLAs

---

## Responsible AI Architecture

```mermaid
flowchart TB
    subgraph InputGuard["🛡️ Input Guard"]
        JailbreakDetect["Jailbreak Detection\n(Azure AI Content Safety)"]
        PromptSanitize["Prompt Sanitization\n(Injection Pattern Stripping)"]
        InputClassify["Intent Classification\n(Allowed vs. Blocked Actions)"]
    end

    subgraph ExecutionGuard["⚙️ Execution Guard"]
        InstructionHierarchy["Instruction Hierarchy\n(System > Agent > User)"]
        ActionScope["Action Scope Enforcement\n(Skill Allowlist per Role)"]
        PIIDetection["PII Detection\n(Azure AI Content Safety)"]
    end

    subgraph OutputGuard["📤 Output Guard"]
        ContentFilter["Content Filtering\n(Harmful Content Detection)"]
        PIIRedaction["PII Auto-Redaction\n(Names, SSNs, Emails)"]
        GroundingCheck["Grounding Verification\n(Source Attribution)"]
    end

    UserInput["User Input"] --> InputGuard
    InputGuard --> ExecutionGuard
    ExecutionGuard --> OutputGuard
    OutputGuard --> SafeResponse["Safe Response"]

    classDef guard fill:#FFEBEE,stroke:#C62828
    class JailbreakDetect,PromptSanitize,InputClassify,InstructionHierarchy,ActionScope,PIIDetection,ContentFilter,PIIRedaction,GroundingCheck guard
```

### RAI Principles Applied

| Principle | How We Implement It |
|---|---|
| **Fairness** | Azure AI Content Safety evaluates all agent outputs for bias; agent instructions prohibit discriminatory actions; skill parameters are schema-validated to prevent skewed queries |
| **Transparency** | Every action logged to Cosmos DB with full provenance; users see a step-by-step execution summary; audit trail is queryable by compliance teams |
| **Privacy** | PII auto-detected and redacted via Content Safety; data residency controls per Azure region; screenshot PII masking; no customer data used for model training |
| **Security** | Multi-layer prompt injection defense; jailbreak detection; credential isolation in Key Vault; zero secrets in code; Conditional Access enforcement |
| **Accountability** | Human-in-the-loop approval for ALL write actions; immutable audit trail with tamper detection; Entra ID RBAC with principle of least privilege |
| **Reliability** | Graceful degradation (API → DOM → error message); retry with exponential backoff; health check endpoints; circuit breaker patterns |
| **Inclusiveness** | Agent responses support multiple languages; accessibility-aware output formatting; keyboard-navigable approval prompts in Teams |

---

## Microsoft Foundry & Fabric Integration

### Foundry — Agent Orchestration at Scale

```mermaid
flowchart LR
    subgraph Foundry["Microsoft Foundry"]
        Registry["Agent Registry\n(Version Control)"]
        Governance["Governance Policies\n(URL Lists, Approvals)"]
        Handoff["Cross-Agent\nHandoff Protocol"]
    end

    BrowserAgent["🌐 Browser Agent"] --> Registry
    Registry --> Governance
    BrowserAgent <-->|"Handoff"| DataAgent["📊 Fabric Data Agent"]
    BrowserAgent <-->|"Handoff"| CalendarAgent["📅 Graph Calendar Agent"]
    BrowserAgent <-->|"Handoff"| EmailAgent["📧 Outlook Email Agent"]

    classDef foundry fill:#F3E5F5,stroke:#7B1FA2
    classDef agent fill:#E8F5E9,stroke:#2E7D32

    class Registry,Governance,Handoff foundry
    class BrowserAgent,DataAgent,CalendarAgent,EmailAgent agent
```

- **Agent Registry** — All browser agent instances are registered, versioned, and governed centrally
- **Cross-Agent Handoff** — The browser agent can delegate sub-tasks to specialized Foundry agents (e.g., hand off analytics to a Fabric data agent)
- **Centralized Governance** — IT admins manage URL allowlists, approval policies, and Content Safety thresholds through the Foundry control plane

### Fabric — Data Intelligence

Agent activity data flows into **Microsoft Fabric** lakehouse for:
- **Usage Analytics** — Skill invocation patterns, most-accessed applications, peak usage times
- **Workflow Optimization** — ML models identify bottleneck steps and suggest faster API paths
- **Cost Analysis** — Azure OpenAI token usage, Container Apps compute, per-workflow ROI
- **Compliance Reporting** — Auto-generated audit reports from Cosmos DB change feed data

### Work IQ — Productivity Intelligence

The agent integrates with **Work IQ** to quantify real productivity impact:

```mermaid
flowchart TB
    subgraph WorkIQFlow["📊 Work IQ Productivity Loop"]
        Measure["1. Measure\n(Time saved, focus hours,\ncontext switches avoided)"]
        Analyze["2. Analyze\n(Compare to baseline,\nidentify patterns)"]
        Recommend["3. Recommend\n(Suggest new workflows,\nexpand to new teams)"]
        Report["4. Report\n(Viva Insights dashboard,\nPower BI, Fabric)"]
    end

    Measure --> Analyze --> Recommend --> Report --> Measure

    AgentLogs["Agent Audit Logs"] --> Measure
    GraphSignals["Graph Signals\n(Calendar, Email, Teams)"] --> Measure
    Report --> VivaInsights["Viva Insights\n(Personal + Manager)"]
    Report --> FabricDash["Fabric Dashboard\n(Org-Level)"]

    classDef workiq fill:#E8F5E9,stroke:#2E7D32
    classDef source fill:#E3F2FD,stroke:#1565C0
    classDef output fill:#F3E5F5,stroke:#7B1FA2

    class Measure,Analyze,Recommend,Report workiq
    class AgentLogs,GraphSignals source
    class VivaInsights,FabricDash output
```

- **Time Intelligence** — Measures actual hours saved per workflow vs. manual baseline (e.g., "Incident resolution saves 39 min per execution")
- **Focus Time Recovery** — Tracks how agent automation frees up uninterrupted deep work blocks (correlates with Microsoft Graph calendar data)
- **Collaboration Velocity** — Measures cross-team handoff speed improvement (e.g., "Cross-app onboarding reduced from 3 days to 45 minutes")
- **Proactive Recommendations** — Surfaces insights like: "Your team's top 3 time-consuming workflows are all automatable — projected savings: 28 hrs/week"
- **Viva Insights Integration** — Productivity metrics surface in employees' personal Viva Insights dashboard and managers' team analytics
