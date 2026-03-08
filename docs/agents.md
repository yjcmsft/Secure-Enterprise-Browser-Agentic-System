# Agents — Secure Enterprise Browser Agentic System

## Overview

This system is built as an **Azure AI Foundry Agent Service** (pro-code) application that combines the Microsoft Agent Framework with browser automation (J-browser-agents) and **Native API Integration** (direct REST/GraphQL calls to target applications) to navigate, read, and act on internal and external web applications on behalf of enterprise users.

The agent is powered by **Azure OpenAI Service (GPT-4o)** via the Azure AI Foundry Agent Service, authenticated through **Azure Entra ID**, protected by **Azure AI Content Safety**, and streamed to frontends via the **AG-UI protocol** (compatible with CopilotKit). It exposes Server-Sent Events (SSE) for real-time streaming updates, tool call progress, and shared state between agent and frontend.

---

## Agent Architecture

```mermaid
flowchart TB
    subgraph Frontend["🖥️ Frontend (AG-UI / CopilotKit)"]
        CopilotKitUI["CopilotKit React UI\n(useAgent hook)"]
        AGUI["AG-UI Protocol\n(SSE Event Stream)"]
    end

    subgraph AgentServer["🔧 Agent Server (Express + AG-UI Handler)"]
        SSEEndpoint["SSE Streaming Endpoint\n(/api/agui/stream)"]
        StateEndpoint["Shared State Endpoint\n(/api/agui/state/:sessionId)"]
        RESTApi["REST API\n(/api/skills/:skillName)"]
    end

    subgraph FoundryService["☁️ Azure AI Foundry Agent Service"]
        AIProject["AIProjectClient\n(@azure/ai-projects)"]
        FoundryAgent["Foundry Agent\n(GPT-4o + Function Tools)"]
        ThreadMgr["Thread & Run Manager"]
    end

    subgraph BrowserAgentCore["🤖 Browser Agent Core"]
        Planner["Task Planner\n(Multi-step Workflow Engine)"]
        Memory["Conversation Memory\n& Workflow State"]
        ToolRouter["Tool Router\n(Skill Dispatcher)"]
    end

    subgraph SecurityBoundary["🔒 Security Boundary"]
        AuthProxy["Auth Delegation\n(Azure Entra ID SSO)"]
        URLGate["URL Allowlist Gate"]
        ApprovalGate["Action Approval Gate\n(Human-in-the-Loop)"]
        Audit["Audit Logger"]
    end

    subgraph BrowserLayer["🌐 Browser Automation"]
        JBrowser["J-browser-agents\n(Headless Browser Pool)"]
        APIIntegration["Native API Integration\n(REST / GraphQL Direct Calls)"]
        DOMFallback["DOM Scraping\n(CSS/XPath Fallback)"]
    end

    subgraph Targets["🏢 Target Applications"]
        Internal["Internal Apps\n(ServiceNow, Jira,\nWorkday, Dashboards)"]
        External["External Sites\n(IR Pages, SEC Filings,\nTravel, E-Commerce)"]
    end

    %% Frontend → Agent Server
    CopilotKitUI -->|"User prompt"| AGUI
    AGUI -->|"POST /api/agui/stream"| SSEEndpoint
    SSEEndpoint -->|"AG-UI events (SSE)"| AGUI

    %% Agent Server → Foundry
    SSEEndpoint --> AIProject
    AIProject --> FoundryAgent
    FoundryAgent -->|"Function calls"| ThreadMgr
    ThreadMgr -->|"Tool invocations"| ToolRouter

    %% Agent Core → Security → Browser
    Planner <--> Memory
    Planner --> ToolRouter
    ToolRouter --> SecurityBoundary
    SecurityBoundary -->|"Preferred path"| APIIntegration
    SecurityBoundary -->|"Fallback path"| DOMFallback
    APIIntegration --> JBrowser
    DOMFallback --> JBrowser
    ApprovalGate -.->|"Approval events"| SSEEndpoint

    %% Browser → Targets
    JBrowser --> Internal
    JBrowser --> External

    %% Results back
    JBrowser -->|"Structured data"| ToolRouter
    ToolRouter -->|"Tool outputs"| ThreadMgr
    ThreadMgr -->|"Agent response"| SSEEndpoint

    %% Styling
    classDef frontend fill:#E3F2FD,stroke:#1565C0,color:#0D47A1
    classDef server fill:#F3E5F5,stroke:#7B1FA2,color:#4A148C
    classDef foundry fill:#E8EAF6,stroke:#283593,color:#1A237E
    classDef core fill:#EDE7F6,stroke:#512DA8,color:#311B92
    classDef sec fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef browser fill:#FFF3E0,stroke:#E65100,color:#BF360C
    classDef target fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20

    class CopilotKitUI,AGUI frontend
    class SSEEndpoint,StateEndpoint,RESTApi server
    class AIProject,FoundryAgent,ThreadMgr foundry
    class Planner,Memory,ToolRouter core
    class AuthProxy,URLGate,ApprovalGate,Audit sec
    class JBrowser,APIIntegration,DOMFallback browser
    class Internal,External target
```

---

## AG-UI Protocol Integration

The agent server implements the **AG-UI (Agent-User Interaction) protocol** — an open, event-driven streaming standard for bidirectional communication between AI agents and frontends.

### AG-UI Event Types

| Category | Events | Purpose |
|---|---|---|
| **Lifecycle** | `RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR` | Track agent execution lifecycle |
| **Messages** | `TEXT_MESSAGE_START`, `TEXT_MESSAGE_CONTENT`, `TEXT_MESSAGE_END` | Stream LLM response tokens |
| **Tool Calls** | `TOOL_CALL_START`, `TOOL_CALL_ARGS`, `TOOL_CALL_END` | Show real-time skill execution |
| **State** | `STATE_SNAPSHOT`, `STATE_DELTA` | Sync shared state with frontend |

### Why AG-UI + CopilotKit?

| Aspect | Without AG-UI | With AG-UI |
|---|---|---|
| **Streaming** | Poll-based, delayed responses | Real-time SSE token streaming |
| **Tool Visibility** | Opaque — user waits blindly | Live tool call progress in UI |
| **Shared State** | Manual sync between agent and UI | Automatic state snapshots |
| **Frontend Flexibility** | Locked to one UI framework | Any AG-UI-compatible frontend |
| **Interoperability** | Custom protocol per agent | Open standard across all agents |

### CopilotKit Frontend Integration

```typescript
import { useAgent } from "@copilotkit/react-core";

function BrowserAgentUI() {
  const { messages, state, sendMessage, isLoading } = useAgent({
    endpoint: "https://your-server.com/api/agui/stream",
  });

  return (
    <div>
      {messages.map(msg => <ChatBubble key={msg.id} {...msg} />)}
      {state.lastSkill && <ToolProgress skill={state.lastSkill} />}
      <input onKeyPress={e =>
        e.key === 'Enter' ? sendMessage(e.target.value) : null
      } disabled={isLoading} />
    </div>
  );
}
```

---

## Agent Types

### 1. Browser Navigation Agent (Primary)

The core agent that navigates web pages, extracts content, fills forms, and submits actions across enterprise applications.

| Property | Value |
|---|---|
| **Type** | Azure AI Foundry Agent (pro-code) |
| **Orchestrator** | Azure AI Foundry Agent Service |
| **Runtime** | @azure/ai-projects + J-browser-agents |
| **Protocol** | AG-UI (SSE) for frontend, Native API (REST/GraphQL preferred) → DOM scraping (fallback) for targets |
| **Auth** | Azure Entra ID SSO / Token Proxy with Conditional Access |
| **Approval** | Human-in-the-loop for destructive actions |
| **AI Safety** | Azure AI Content Safety for input/output screening |

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

## Agent Package Structure

```
app-package/
├── manifest.json                  # Agent manifest (Azure AI Foundry)
├── declarativeAgent.json          # Agent config (model, instructions, streaming)
├── browserPlugin.json             # Function tool definitions
├── openapi/
│   ├── browser-tools.yml          # OpenAPI spec for browser tools
│   └── api-connectors.yml         # OpenAPI spec for native API connectors
├── color.png                      # 192x192 color icon
└── outline.png                    # 32x32 outline icon
```

---

## Native API Integration

The agent uses a **dual-path strategy** to interact with target web applications:

```mermaid
flowchart LR
    Agent["🤖 Browser Agent"] --> Check{"App exposes\nREST/GraphQL API?"}

    Check -->|"Yes ✅"| APIPath["📡 API Path"]
    Check -->|"No ❌"| DOMPath["🔧 DOM Path"]

    subgraph APIPath_detail["Native API (Fast + Reliable)"]
        Discover["1. Discover API schema\n(OpenAPI / Swagger)"]
        REST["2a. REST API\n(CRUD operations)"]
        GraphQL["2b. GraphQL API\n(Flexible queries)"]
        Structured["3. Structured response"]
    end

    subgraph DOMPath_detail["DOM Scraping (Universal Fallback)"]
        Navigate["1. Load full page"]
        Parse["2. Parse DOM tree"]
        Select["3. CSS/XPath selectors"]
        Act["4. Click / Fill / Read"]
    end

    APIPath --> Discover --> REST --> Structured
    Discover --> GraphQL --> Structured
    DOMPath --> Navigate --> Parse --> Select --> Act

    style APIPath_detail fill:#E8EAF6,stroke:#283593
    style DOMPath_detail fill:#FFF3E0,stroke:#E65100
```

### Why Native API Integration + Azure AI Foundry?

| Aspect | Without Native APIs | With Native APIs |
|---|---|---|
| **Tool Discovery** | Agent must infer page structure from DOM | Agent discovers endpoints via OpenAPI/Swagger specs |
| **Reliability** | Brittle — breaks when UI changes | Stable — uses application's own API contract |
| **Speed** | Full page render + DOM parsing | Direct HTTP call with structured response |
| **Accuracy** | Risk of wrong element selection | Zero ambiguity — API defines exact operations |
| **Compatibility** | Depends on browser-specific protocols | Works with any HTTP client, any runtime |

### API Integration Points

1. **API Schema Discovery** — When the agent targets a new application, it probes for OpenAPI/Swagger specs (e.g., `/api/openapi.json`, `/swagger.json`, `/.well-known/api-spec`) to understand available endpoints
2. **REST API** — Standard CRUD operations (GET, POST, PUT, DELETE) for reading data, creating records, updating fields, and triggering actions
3. **GraphQL API** — Complex queries spanning multiple resources, flexible field selection, and batch operations
4. **Fallback** — If the application doesn't expose a usable API, the agent falls back to traditional DOM scraping via J-browser-agents

---

## Agent Lifecycle

```mermaid
sequenceDiagram
    participant Admin as IT Admin
    participant Foundry as Azure AI Foundry
    participant User as Employee
    participant Frontend as CopilotKit UI
    participant Server as Agent Server
    participant Agent as Foundry Agent

    Note over Admin,Foundry: Deployment Phase
    Admin->>Foundry: Deploy agent via Azure AI Foundry
    Foundry->>Foundry: Provision agent + model + tools
    Admin->>Server: Deploy Express server (Container Apps)

    Note over User,Agent: Runtime Phase
    User->>Frontend: "Pull MSFT annual report data"
    Frontend->>Server: POST /api/agui/stream {prompt}
    Server->>Agent: Create thread + run with tools
    Agent->>Agent: Plan multi-step workflow
    Agent->>Server: Function call: navigate_page
    Server-->>Frontend: SSE: TOOL_CALL_START
    Server->>Server: Execute skill via ToolRouter
    Server-->>Frontend: SSE: TOOL_CALL_END + STATE_SNAPSHOT
    Agent->>Server: Function call: extract_content
    Server-->>Frontend: SSE: TOOL_CALL_START → TOOL_CALL_END
    Agent-->>Server: Final response text
    Server-->>Frontend: SSE: TEXT_MESSAGE_CONTENT → RUN_FINISHED
    Frontend-->>User: Formatted answer with real-time progress

    Note over Admin,Foundry: Monitoring Phase
    Server->>Foundry: Audit logs (every action logged)
    Admin->>Foundry: Review usage & compliance reports
```

---

## Related Files

- **[README.md](./README.md)** — Executive summary, Azure integration, ROI metrics, customer validation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Full system architecture diagram with all layers, Azure infrastructure, Responsible AI, observability
- **[skills.md](./skills.md)** — Detailed skill definitions, API plugin spec, Microsoft Graph skills, Azure AI Content Safety integration

---

## Azure Entra ID Authentication Flow

All agent-to-application authentication uses **Azure Entra ID** with delegated token proxy:

```mermaid
sequenceDiagram
    participant User as Employee
    participant Frontend as CopilotKit UI
    participant Server as Agent Server
    participant Entra as Azure Entra ID
    participant Agent as Foundry Agent
    participant KV as Azure Key Vault
    participant App as Target App (ServiceNow)

    User->>Frontend: "Close ticket INC0042"
    Frontend->>Server: POST /api/agui/stream
    Server->>Entra: Validate user identity (SSO)
    Entra->>Entra: Check Conditional Access policies
    Entra-->>Server: ✅ User authenticated (token issued)

    Server->>Agent: Create run with user context
    Agent->>Server: Function call: submit_action
    Server->>KV: Retrieve app-specific credentials
    KV-->>Server: ServiceNow OAuth token (scoped: read+write)

    Server->>Entra: Request delegated token for ServiceNow
    Entra->>Entra: Validate RBAC (user has ITSM role)
    Entra-->>Server: Delegated token (scoped to user permissions)

    Server->>App: API call with delegated token
    App-->>Server: Response (user's permission level)
    Server-->>Frontend: SSE: TOOL_CALL_END + result
```

### Token Scoping by Skill

| Skill | Minimum Required Permission | Token Scope |
|---|---|---|
| `navigate_page` | Read | `Application.Read` |
| `extract_content` | Read | `Application.Read` |
| `fill_form` | Read + Write | `Application.ReadWrite` |
| `submit_action` | Read + Write + Execute | `Application.ReadWrite.All` |
| `discover_apis` | Read | `Application.Read` |
| Microsoft Graph skills | Varies | `Chat.ReadWrite`, `Mail.Send`, `Calendars.ReadWrite` |

---

## Azure AI Foundry Integration

The browser agent is deployed and managed via **Azure AI Foundry** for enterprise-scale agent management:

```mermaid
flowchart TB
    subgraph Foundry["Azure AI Foundry"]
        Project["AI Project"]
        AgentService["Agent Service\n(GPT-4o + Tools)"]
        Governance["Governance\n(Policies + Compliance)"]
        Analytics["Agent Analytics\n(Usage + Performance)"]
    end

    subgraph AgentStack["Agent Stack"]
        Browser["🌐 Browser Agent\nv1.0.0"]
        AGUI["📡 AG-UI Streaming\n(SSE Events)"]
        Skills["🔧 12 Function Tools"]
    end

    subgraph Infra["Azure Infrastructure"]
        ContainerApps["Azure Container Apps"]
        CosmosDB["Cosmos DB\n(Audit + State)"]
        KeyVault["Azure Key Vault"]
        ContentSafety["AI Content Safety"]
        AppInsights["Application Insights"]
    end

    Project --> AgentService
    AgentService --> Browser
    Browser --> AGUI
    Browser --> Skills
    Governance -->|"URL allowlists\nApproval policies"| Browser
    Browser --> Analytics

    Browser --> ContainerApps
    Browser --> CosmosDB
    Browser --> KeyVault
    Browser --> ContentSafety
    Browser --> AppInsights

    classDef foundry fill:#E8EAF6,stroke:#283593
    classDef agent fill:#E8F5E9,stroke:#2E7D32
    classDef infra fill:#FFF3E0,stroke:#E65100

    class Project,AgentService,Governance,Analytics foundry
    class Browser,AGUI,Skills agent
    class ContainerApps,CosmosDB,KeyVault,ContentSafety,AppInsights infra
```

### Cross-Agent Handoff Scenarios

| Scenario | Browser Agent Does | Hands Off To |
|---|---|---|
| Financial report + analysis | Extracts data from IR pages | **Fabric Data Agent** for statistical analysis |
| Incident + stakeholder notification | Reads incident details | **Outlook Agent** to email stakeholders |
| Onboarding + calendar setup | Creates accounts across apps | **Calendar Agent** to schedule orientation meetings |
| Compliance audit + reporting | Scrapes regulatory filings | **Fabric Data Agent** for compliance dashboard |

---

## Microsoft Fabric Analytics

Agent activity data streams into **Microsoft Fabric** via Cosmos DB change feed:

- **Usage Dashboards** — Skill invocation patterns, most-accessed apps, peak hours, user adoption curves
- **Workflow Intelligence** — ML models identify bottleneck steps and recommend faster paths (e.g., "ServiceNow API is 3x faster than DOM for ticket updates")
- **Cost Optimization** — Track Azure OpenAI token consumption, Container Apps compute costs, and per-workflow ROI
- **Compliance Reporting** — Auto-generated audit reports with tamper-proof provenance from Cosmos DB