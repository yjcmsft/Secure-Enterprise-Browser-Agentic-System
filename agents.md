# Agents — Secure Enterprise Browser Agentic System

## Overview

This system is built as a **Microsoft 365 Copilot declarative agent** that combines the Copilot SDK orchestrator with browser automation (J-browser-agents) and Chrome's [WebMCP protocol](https://developer.chrome.com/blog/webmcp-epp) to navigate, read, and act on internal and external web applications on behalf of enterprise users.

The agent is packaged and distributed through the Microsoft 365 app model, appearing contextually within Copilot Chat, Teams, Outlook, and other M365 surfaces.

---

## Agent Architecture

```mermaid
flowchart TB
    subgraph M365["Microsoft 365 Copilot Platform"]
        Orchestrator["Copilot Orchestrator\n(Foundation Models + RAG)"]
        AgentRuntime["Declarative Agent Runtime"]
        CopilotUI["Copilot Chat UI\n(Teams / Outlook / Web)"]
    end

    subgraph AgentPackage["📦 Browser Agent App Package"]
        Manifest["manifest.json\n(M365 App Manifest v1.18+)"]
        AgentDef["declarativeAgent.json\n(Instructions + Capabilities)"]
        PluginDef["browserPlugin.json\n(API Plugin Manifest)"]
        Icons["color.png + outline.png"]
    end

    subgraph BrowserAgentCore["🤖 Browser Agent Core"]
        Planner["Task Planner\n(Multi-step Workflow Engine)"]
        Memory["Conversation Memory\n& Workflow State"]
        ToolRouter["Tool Router\n(Skill Dispatcher)"]
    end

    subgraph SecurityBoundary["🔒 Security Boundary"]
        AuthProxy["Auth Delegation\n(SSO / Token Proxy)"]
        URLGate["URL Allowlist Gate"]
        ApprovalGate["Action Approval Gate\n(Human-in-the-Loop)"]
        Audit["Audit Logger"]
    end

    subgraph BrowserLayer["🌐 Browser Automation"]
        JBrowser["J-browser-agents\n(Headless Browser Pool)"]
        WebMCP["WebMCP Protocol\n(Declarative + Imperative APIs)"]
        DOMFallback["DOM Scraping\n(CSS/XPath Fallback)"]
    end

    subgraph Targets["🏢 Target Applications"]
        Internal["Internal Apps\n(ServiceNow, Jira,\nWorkday, Dashboards)"]
        External["External Sites\n(IR Pages, SEC Filings,\nTravel, E-Commerce)"]
    end

    %% M365 Platform → Agent
    CopilotUI -->|"User prompt"| Orchestrator
    Orchestrator -->|"Route to agent"| AgentRuntime
    AgentRuntime -->|"Load config"| AgentPackage
    AgentRuntime -->|"Execute"| BrowserAgentCore

    %% Agent Core → Security → Browser
    Planner <--> Memory
    Planner --> ToolRouter
    ToolRouter --> SecurityBoundary
    SecurityBoundary -->|"Preferred path"| WebMCP
    SecurityBoundary -->|"Fallback path"| DOMFallback
    WebMCP --> JBrowser
    DOMFallback --> JBrowser
    ApprovalGate -.->|"Confirm destructive actions"| CopilotUI

    %% Browser → Targets
    JBrowser --> Internal
    JBrowser --> External

    %% Results back
    JBrowser -->|"Structured data"| Planner
    Planner -->|"Response"| Orchestrator
    Orchestrator -->|"Answer"| CopilotUI

    %% Styling
    classDef m365 fill:#E3F2FD,stroke:#1565C0,color:#0D47A1
    classDef pkg fill:#F3E5F5,stroke:#7B1FA2,color:#4A148C
    classDef core fill:#EDE7F6,stroke:#512DA8,color:#311B92
    classDef sec fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef browser fill:#FFF3E0,stroke:#E65100,color:#BF360C
    classDef target fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20

    class Orchestrator,AgentRuntime,CopilotUI m365
    class Manifest,AgentDef,PluginDef,Icons pkg
    class Planner,Memory,ToolRouter core
    class AuthProxy,URLGate,ApprovalGate,Audit sec
    class JBrowser,WebMCP,DOMFallback browser
    class Internal,External target
```

---

## Agent Types

### 1. Browser Navigation Agent (Primary)

The core agent that navigates web pages, extracts content, fills forms, and submits actions across enterprise applications.

| Property | Value |
|---|---|
| **Type** | Declarative Agent (M365 Copilot) |
| **Orchestrator** | Microsoft 365 Copilot Orchestrator |
| **Runtime** | Copilot SDK + J-browser-agents |
| **Protocol** | WebMCP (preferred) → DOM scraping (fallback) |
| **Auth** | Delegated SSO / Token Proxy |
| **Approval** | Human-in-the-loop for destructive actions |

### 2. Data Extraction Agent

A specialized sub-agent focused on reading and structuring data from web pages — financial tables, dashboards, reports.

| Property | Value |
|---|---|
| **Focus** | Read-only content extraction |
| **Output** | Structured tables, JSON, Markdown summaries |
| **Use Cases** | SEC filings, investor reports, analytics dashboards |
| **Security** | No write actions, no approval gates needed |

### 3. Workflow Automation Agent

Orchestrates multi-step, cross-application workflows spanning multiple web apps in a single session.

| Property | Value |
|---|---|
| **Focus** | Multi-step write workflows |
| **Pattern** | Navigate → Extract → Fill → Submit → Repeat |
| **Use Cases** | Incident resolution, onboarding, procurement |
| **Security** | Approval required for every write action |

---

## M365 App Package Structure

```
secure-browser-agent/
├── manifest.json                  # M365 App Manifest (v1.18+)
├── declarativeAgent.json          # Agent instructions & capabilities
├── browserPlugin.json             # API plugin (browser automation skills)
├── openapi/
│   ├── browser-tools.yml          # OpenAPI spec for browser tools
│   └── webmcp-bridge.yml          # OpenAPI spec for WebMCP bridge
├── color.png                      # 192x192 color icon
└── outline.png                    # 32x32 outline icon
```

### manifest.json (Simplified)

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.18/MicrosoftTeams.schema.json",
  "manifestVersion": "1.18",
  "version": "1.0.0",
  "id": "{{AGENT_APP_ID}}",
  "developer": {
    "name": "Enterprise Browser Agent",
    "websiteUrl": "https://github.com/example/secure-browser-agent",
    "privacyUrl": "https://example.com/privacy",
    "termsOfUseUrl": "https://example.com/terms"
  },
  "name": {
    "short": "Browser Agent",
    "full": "Secure Enterprise Browser Agent"
  },
  "description": {
    "short": "Navigate, read, and act on web apps securely",
    "full": "An AI agent that navigates internal and external web applications on behalf of the user — reading, summarizing, and taking actions — with enterprise security controls including auth delegation, URL allowlisting, and action approval gates."
  },
  "icons": {
    "color": "color.png",
    "outline": "outline.png"
  },
  "accentColor": "#1565C0",
  "copilotAgents": {
    "declarativeAgents": [
      {
        "id": "browser-agent",
        "file": "declarativeAgent.json"
      }
    ]
  }
}
```

### declarativeAgent.json

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.6/schema.json",
  "version": "v1.6",
  "name": "Secure Browser Agent",
  "description": "Navigates enterprise web apps, extracts data, fills forms, and submits actions with security controls.",
  "instructions": "You are a secure enterprise browser agent. You help users interact with internal web applications (ServiceNow, Jira, Workday, Grafana, etc.) and external sites (investor relations, SEC filings, travel portals). Always: (1) Check URL allowlist before navigating, (2) Use WebMCP structured tools when available, fall back to DOM scraping, (3) Request user approval before any write/submit action, (4) Log all actions to audit trail. Never: navigate to URLs outside the allowlist, submit forms without explicit user approval, or expose auth tokens in responses.",
  "conversation_starters": [
    { "text": "Pull the SUMMARY RESULTS OF OPERATIONS from Microsoft's 2024 annual report" },
    { "text": "Close ServiceNow ticket INC0042 and link it to the Jira bug" },
    { "text": "Show me the error rate from the Grafana payments dashboard for the last hour" },
    { "text": "Book the cheapest direct flight from Seattle to New York on March 15" },
    { "text": "Start onboarding for new hire Jane Doe across Workday, Jira, and ServiceNow" }
  ],
  "capabilities": [
    { "name": "CodeInterpreter" }
  ],
  "actions": [
    {
      "id": "browser-tools",
      "file": "browserPlugin.json"
    }
  ]
}
```

---

## WebMCP Connection

The agent uses a **dual-path strategy** to interact with target web applications:

```mermaid
flowchart LR
    Agent["🤖 Browser Agent"] --> Check{"Site exposes\nWebMCP tools?"}

    Check -->|"Yes ✅"| WebMCPPath["📡 WebMCP Path"]
    Check -->|"No ❌"| DOMPath["🔧 DOM Path"]

    subgraph WebMCPPath_detail["WebMCP (Fast + Reliable)"]
        Discover["1. Discover tool manifest"]
        Declarative["2a. Declarative API\n(HTML form actions)"]
        Imperative["2b. Imperative API\n(JS-driven flows)"]
        Structured["3. Structured response"]
    end

    subgraph DOMPath_detail["DOM Scraping (Universal Fallback)"]
        Navigate["1. Load full page"]
        Parse["2. Parse DOM tree"]
        Select["3. CSS/XPath selectors"]
        Act["4. Click / Fill / Read"]
    end

    WebMCPPath --> Discover --> Declarative --> Structured
    Discover --> Imperative --> Structured
    DOMPath --> Navigate --> Parse --> Select --> Act

    style WebMCPPath_detail fill:#E8EAF6,stroke:#283593
    style DOMPath_detail fill:#FFF3E0,stroke:#E65100
```

### Why WebMCP + M365 Copilot?

| Aspect | Without WebMCP | With WebMCP |
|---|---|---|
| **Tool Discovery** | Agent must infer page structure from DOM | Site declares available tools explicitly |
| **Reliability** | Brittle — breaks when UI changes | Stable — uses site's own structured interface |
| **Speed** | Full page render + DOM parsing | Direct API call via structured protocol |
| **Accuracy** | Risk of wrong element selection | Zero ambiguity — site defines exact actions |
| **Security** | Agent has full DOM access | Site controls exactly what agent can do |

### WebMCP Integration Points

1. **Tool Discovery** — When the agent navigates to a WebMCP-enabled site, it reads the tool manifest to understand what structured actions are available
2. **Declarative API** — Simple form-based actions (search, filter, submit) are handled via HTML form definitions exposed by the site
3. **Imperative API** — Complex dynamic interactions (multi-step wizards, conditional flows) are executed via JavaScript APIs exposed by the site
4. **Fallback** — If the site doesn't support WebMCP, the agent falls back to traditional DOM scraping via J-browser-agents

---

## Agent Lifecycle

```mermaid
sequenceDiagram
    participant Admin as IT Admin
    participant Store as M365 Admin Center
    participant User as Employee
    participant Copilot as M365 Copilot
    participant Agent as Browser Agent

    Note over Admin,Store: Deployment Phase
    Admin->>Store: Upload app package (.zip)
    Store->>Store: Validate manifest + RAI checks
    Store->>Store: Approve & publish to tenant

    Note over User,Agent: Runtime Phase
    User->>Copilot: "@BrowserAgent pull MSFT annual report data"
    Copilot->>Copilot: Route to declarative agent
    Copilot->>Agent: Execute with instructions + capabilities
    Agent->>Agent: Plan multi-step workflow
    Agent->>Agent: Execute tools (navigate → extract → respond)
    Agent-->>Copilot: Structured response
    Copilot-->>User: Formatted answer with data table

    Note over Admin,Store: Monitoring Phase
    Agent->>Store: Audit logs (every action logged)
    Admin->>Store: Review usage & compliance reports
```

---

## Related Files

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Full system architecture diagram with all layers
- **[skills.md](./skills.md)** — Detailed skill definitions and tool specifications
