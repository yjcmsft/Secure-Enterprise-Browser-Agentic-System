# Secure Enterprise Browser Agentic System — Architecture

## System Diagram

```mermaid
flowchart TB
    subgraph UserLayer["👤 User Layer"]
        Employee["Employee"]
        CopilotChat["Copilot Chat / CLI Interface"]
    end

    subgraph AgentOrchestrator["🤖 Agent Orchestrator (Copilot SDK)"]
        Planner["Task Planner\n(Multi-step Workflow Engine)"]
        Memory["Context & Memory Store"]
        Router["Tool Router"]
    end

    subgraph SecurityLayer["🔒 Security Boundary Layer"]
        AuthDelegation["Auth Delegation\n(SSO / Token Proxy)"]
        URLAllowlist["URL Allowlisting\n(Domain & Path Rules)"]
        ApprovalGate["Action Approval Gate\n(Human-in-the-Loop)"]
        AuditLog["Audit Log &\nCompliance Trail"]
    end

    subgraph ToolLayer["🛠️ Agent Tools"]
        Navigate["navigate_page\n(URL navigation,\nclick, scroll)"]
        Extract["extract_content\n(Read & summarize\npage data)"]
        FillForm["fill_form\n(Input fields,\ndropdowns, dates)"]
        Submit["submit_action\n(Buttons, approvals,\nstate transitions)"]
    end

    subgraph WebMCPLayer["📡 WebMCP Protocol Layer (Chrome EPP)"]
        Declarative["Declarative API\n(HTML form-based\nstructured actions)"]
        Imperative["Imperative API\n(JS-executed\ndynamic interactions)"]
        ToolDiscovery["Tool Discovery\n(Site-exposed structured\ntool definitions)"]
    end

    subgraph BrowserEngine["🌐 Browser Automation (J-browser-agents)"]
        Headless["Headless Browser\nInstance Pool"]
        DOMParser["DOM Parser &\nElement Selector"]
        SessionMgr["Session & Cookie\nManager"]
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

    %% User → Agent
    Employee -->|"Natural language request"| CopilotChat
    CopilotChat -->|"Parsed intent"| Planner
    Planner <-->|"State tracking"| Memory
    Planner -->|"Tool calls"| Router

    %% Router → Tools
    Router -->|"Route to tool"| Navigate
    Router -->|"Route to tool"| Extract
    Router -->|"Route to tool"| FillForm
    Router -->|"Route to tool"| Submit

    %% Tools → Security
    Navigate & Extract & FillForm & Submit -->|"All actions pass through"| SecurityLayer

    %% Security → WebMCP / Browser
    AuthDelegation -->|"Inject auth tokens"| Headless
    URLAllowlist -->|"Validate target URL"| Headless
    ApprovalGate -->|"Request user confirmation\n(destructive actions)"| Employee
    ApprovalGate -->|"Approved action"| Headless
    AuditLog -.->|"Log every action"| SecurityLayer

    %% WebMCP integration
    SecurityLayer -->|"Prefer structured path\nwhen available"| WebMCPLayer
    SecurityLayer -->|"Fallback: raw DOM"| Headless
    ToolDiscovery -->|"Discover site-exposed\ntools & schemas"| Planner
    Declarative -->|"Form submission\nvia HTML actions"| Headless
    Imperative -->|"JS execution\nfor complex flows"| Headless

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

    %% Results back to agent
    Extract -->|"Structured data /\nsummarized content"| Planner
    Submit -->|"Action result"| Planner
    Planner -->|"Final response"| CopilotChat
    CopilotChat -->|"Answer / confirmation"| Employee

    %% Styling
    classDef userStyle fill:#E3F2FD,stroke:#1565C0,color:#0D47A1
    classDef agentStyle fill:#F3E5F5,stroke:#7B1FA2,color:#4A148C
    classDef securityStyle fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef toolStyle fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef webmcpStyle fill:#E8EAF6,stroke:#283593,color:#1A237E
    classDef browserStyle fill:#FFF3E0,stroke:#E65100,color:#BF360C
    classDef internalStyle fill:#F1F8E9,stroke:#558B2F,color:#33691E
    classDef publicStyle fill:#FFF8E1,stroke:#F9A825,color:#F57F17

    class Employee,CopilotChat userStyle
    class Planner,Memory,Router agentStyle
    class AuthDelegation,URLAllowlist,ApprovalGate,AuditLog securityStyle
    class Navigate,Extract,FillForm,Submit toolStyle
    class Declarative,Imperative,ToolDiscovery webmcpStyle
    class Headless,DOMParser,SessionMgr browserStyle
    class ServiceNow,Jira,Dashboards internalStyle
    class InvestorPages,ECommerce,TravelBooking publicStyle
```

## Layer Descriptions

| Layer | Purpose |
|---|---|
| **User Layer** | Employee interacts via natural language through Copilot Chat or CLI |
| **Agent Orchestrator** | Copilot SDK plans multi-step workflows, tracks context, and routes tool calls |
| **Security Boundary** | Auth delegation (SSO/token proxy), URL allowlisting, human-in-the-loop approval gates, and full audit logging |
| **Agent Tools** | Four core tools — `navigate_page`, `extract_content`, `fill_form`, `submit_action` |
| **WebMCP Protocol** | Chrome's [WebMCP](https://developer.chrome.com/blog/webmcp-epp) standard — sites expose structured tools via **Declarative API** (HTML forms) and **Imperative API** (JavaScript), enabling faster and more reliable agent workflows than raw DOM manipulation |
| **Browser Automation** | J-browser-agents manages headless browser instances, DOM parsing, and session/cookie handling |
| **Target Apps** | Internal enterprise apps (ServiceNow, Jira, dashboards) and public/external sites (investor pages, e-commerce, travel portals) |

## WebMCP Integration

```mermaid
flowchart LR
    subgraph Traditional["🔧 Traditional Path (Fallback)"]
        direction TB
        T1["Agent Tool Call"] --> T2["DOM Inspection"]
        T2 --> T3["CSS/XPath Selectors"]
        T3 --> T4["Click / Fill / Submit"]
        T4 --> T5["Parse Response DOM"]
    end

    subgraph WebMCPPath["📡 WebMCP Path (Preferred)"]
        direction TB
        W1["Agent Tool Call"] --> W2["Discover Site Tools\n(WebMCP manifest)"]
        W2 --> W3{"Declarative or\nImperative?"}
        W3 -->|"Simple form"| W4["Declarative API\n(HTML action)"]
        W3 -->|"Complex flow"| W5["Imperative API\n(JS execution)"]
        W4 --> W6["Structured Response"]
        W5 --> W6
    end

    Agent["🤖 Agent"] --> Traditional
    Agent --> WebMCPPath

    style WebMCPPath fill:#E8EAF6,stroke:#283593
    style Traditional fill:#FFF3E0,stroke:#E65100
```

> **Why WebMCP matters:** When a website exposes WebMCP tools, the agent skips brittle DOM scraping and uses the site's own structured APIs. This is faster, more reliable, and eliminates ambiguity — the site tells the agent exactly what actions are available and how to invoke them.

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

## Example 3 — Multi-Step Travel Booking with WebMCP

**Scenario:** An employee asks: _"Book me the cheapest direct flight from Seattle to New York on March 15, and submit for manager approval."_

This example showcases WebMCP's **Declarative API** for the search form and **Imperative API** for the dynamic results filtering.

```mermaid
sequenceDiagram
    participant E as Employee
    participant A as Agent
    participant S as Security
    participant W as WebMCP
    participant B as Browser
    participant T as Corporate Travel Portal

    E->>A: "Book cheapest direct SEA→JFK,<br/>March 15, submit for approval"

    Note over A: Step 1 — Discover site tools via WebMCP
    A->>B: navigate_page(travel.corp)
    B->>T: GET /travel
    T-->>B: Page + WebMCP tool manifest
    B->>W: Parse WebMCP tools
    W-->>A: Available tools:<br/>• search_flights (Declarative)<br/>• filter_results (Imperative)<br/>• select_flight (Imperative)<br/>• submit_booking (Declarative)

    Note over A: Step 2 — Search via Declarative API
    A->>W: search_flights(from:SEA, to:JFK,<br/>date:2026-03-15, direct:true)
    W->>T: HTML form POST (structured)
    T-->>W: 8 results
    W-->>A: Flight results (structured JSON)

    Note over A: Step 3 — Filter & select via Imperative API
    A->>W: filter_results(sort:price_asc)
    W->>T: JS execution (dynamic sort)
    T-->>W: Sorted results
    W-->>A: Cheapest: Alaska AS204, $189, departs 6:15 AM

    Note over A: Step 4 — Book via Declarative API
    A->>S: submit_booking(flight:AS204)
    S->>S: ⚠️ Financial action — approval needed
    S->>E: "Book Alaska AS204 SEA→JFK $189?"
    E->>S: ✅ Approved
    S->>W: submit_booking(AS204, approval:manager)
    W->>T: HTML form POST
    T-->>W: Booking submitted for manager approval
    W-->>A: Confirmation #TRV-29481

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

- **[agents.md](./agents.md)** — Agent types, M365 Copilot app packaging, declarative agent manifest, and WebMCP connection strategy
- **[skills.md](./skills.md)** — Detailed skill definitions (`navigate_page`, `extract_content`, `fill_form`, `submit_action`, `discover_tools`, `compare_data`), API plugin spec, and security classifications
