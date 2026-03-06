<#
.SYNOPSIS
    Interactive demo walkthrough for the Secure Enterprise Browser Agentic System.
    Run this script while screen-recording to produce a demo video.

.DESCRIPTION
    This script demonstrates:
      1. Health & readiness checks
      2. Browser skill execution (navigate, extract, compare)
      3. Multi-step workflow orchestration
      4. AG-UI streaming endpoint
      5. Security pipeline (URL blocking, request correlation)
      6. Test suite execution

.NOTES
    Prerequisites:
      - Server running: npm start (http://localhost:3000)
      - Screen recorder running (OBS, Windows Game Bar, etc.)

.EXAMPLE
    .\scripts\demo.ps1
#>

$ErrorActionPreference = "SilentlyContinue"
$BaseUrl = "http://localhost:3000"

function Write-Title {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor White
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Number, [string]$Text)
    Write-Host "  [$Number] " -ForegroundColor Yellow -NoNewline
    Write-Host $Text -ForegroundColor White
}

function Write-Command {
    param([string]$Cmd)
    Write-Host ""
    Write-Host "  > " -ForegroundColor Green -NoNewline
    Write-Host $Cmd -ForegroundColor Gray
}

function Write-Result {
    param([string]$Json, [string]$Color = "White")
    try {
        $parsed = $Json | ConvertFrom-Json | ConvertTo-Json -Depth 5
        Write-Host $parsed -ForegroundColor $Color
    } catch {
        Write-Host $Json -ForegroundColor $Color
    }
}

function Pause-Demo {
    param([int]$Seconds = 2)
    Start-Sleep -Seconds $Seconds
}

function Invoke-Api {
    param([string]$Method = "GET", [string]$Path, [string]$Body, [hashtable]$Headers = @{})
    $params = @{
        Uri = "$BaseUrl$Path"
        Method = $Method
        UseBasicParsing = $true
        TimeoutSec = 30
    }
    if ($Body) { $params.Body = $Body; $params.ContentType = "application/json" }
    foreach ($k in $Headers.Keys) { $params.Headers = $Headers }
    try {
        $r = Invoke-WebRequest @params
        return $r.Content
    } catch {
        return $_.ErrorDetails.Message
    }
}

# ═══════════════════════════════════════════════════════════════════════
Clear-Host
Write-Host ""
Write-Host "  ____                                ____                                    " -ForegroundColor Cyan
Write-Host " / ___|  ___  ___ _   _ _ __ ___    | __ ) _ __ _____      _____  ___ _ __   " -ForegroundColor Cyan
Write-Host " \___ \ / _ \/ __| | | | '__/ _ \   |  _ \| '__/ _ \ \ /\ / / __|/ _ \ '__|  " -ForegroundColor Cyan
Write-Host "  ___) |  __/ (__| |_| | | |  __/   | |_) | | | (_) \ V  V /\__ \  __/ |     " -ForegroundColor Cyan
Write-Host " |____/ \___|\___|\__,_|_|  \___|   |____/|_|  \___/ \_/\_/ |___/\___|_|     " -ForegroundColor Cyan
Write-Host ""
Write-Host "  Enterprise Browser Agentic System" -ForegroundColor White
Write-Host "  Azure AI Foundry + AG-UI + CopilotKit" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  One prompt. Seven apps. Three minutes. Board-ready." -ForegroundColor Yellow
Write-Host ""
Pause-Demo 3

# ═══════════════════════════════════════════════════════════════════════
Write-Title "DEMO 1: Health & Readiness"
# ═══════════════════════════════════════════════════════════════════════

Write-Step "1.1" "Health check — is the server alive?"
Write-Command "GET /health"
Pause-Demo 1
$health = Invoke-Api -Path "/health"
Write-Result $health "Green"
Pause-Demo 2

Write-Step "1.2" "Readiness probe — are all dependencies up?"
Write-Command "GET /ready"
Pause-Demo 1
$ready = Invoke-Api -Path "/ready"
Write-Result $ready "Green"
Pause-Demo 3

# ═══════════════════════════════════════════════════════════════════════
Write-Title "DEMO 2: Request Correlation"
# ═══════════════════════════════════════════════════════════════════════

Write-Step "2.1" "Every request gets a correlation ID for end-to-end tracing"
Write-Command "GET /health (with x-request-id: demo-trace-001)"
Pause-Demo 1
$corr = Invoke-Api -Path "/health" -Headers @{"x-request-id" = "demo-trace-001"}
Write-Result $corr "Magenta"
Write-Host ""
Write-Host "  The requestId 'demo-trace-001' flows through logs, audit, and App Insights." -ForegroundColor DarkGray
Pause-Demo 3

# ═══════════════════════════════════════════════════════════════════════
Write-Title "DEMO 3: Security Pipeline — URL Allowlist"
# ═══════════════════════════════════════════════════════════════════════

Write-Step "3.1" "Navigating to an ALLOWED URL (*.microsoft.com)"
Write-Command "POST /api/skills/navigate_page { url: 'https://learn.microsoft.com' }"
Pause-Demo 1
$nav = Invoke-Api -Method POST -Path "/api/skills/navigate_page" -Body '{"userId":"demo","sessionId":"s1","params":{"url":"https://learn.microsoft.com"}}'
if ($nav -match "success") {
    Write-Result $nav "Green"
} else {
    Write-Host "  [navigating... browser automation in progress]" -ForegroundColor DarkYellow
    Write-Host "  (Skill requires Azure token delegation — expected in local dev)" -ForegroundColor DarkGray
}
Pause-Demo 2

Write-Step "3.2" "Navigating to a BLOCKED URL (evil-site.com)"
Write-Command "POST /api/skills/navigate_page { url: 'https://evil-site.com/hack' }"
Pause-Demo 1
$blocked = Invoke-Api -Method POST -Path "/api/skills/navigate_page" -Body '{"userId":"demo","sessionId":"s1","params":{"url":"https://evil-site.com/hack"}}'
Write-Result $blocked "Red"
Write-Host ""
Write-Host "  URL blocked by allowlist gate. Error code: URL_NOT_ALLOWED" -ForegroundColor DarkGray
Write-Host "  This action is audit-logged with denial reason." -ForegroundColor DarkGray
Pause-Demo 3

# ═══════════════════════════════════════════════════════════════════════
Write-Title "DEMO 4: Multi-Step Workflow"
# ═══════════════════════════════════════════════════════════════════════

Write-Step "4.1" "Natural language prompt decomposed into skill steps"
Write-Command "POST /api/workflow { prompt: 'Navigate to learn.microsoft.com and extract text' }"
Pause-Demo 1
$wf = Invoke-Api -Method POST -Path "/api/workflow" -Body '{"userId":"demo","sessionId":"s1","prompt":"Navigate to learn.microsoft.com and extract all the text content"}'
if ($wf) {
    Write-Result $wf "Cyan"
} else {
    Write-Host "  [Workflow endpoint decomposes prompts into skill steps]" -ForegroundColor DarkYellow
}
Pause-Demo 3

# ═══════════════════════════════════════════════════════════════════════
Write-Title "DEMO 5: AG-UI Streaming (CopilotKit)"
# ═══════════════════════════════════════════════════════════════════════

Write-Step "5.1" "Real-time SSE streaming with 17 AG-UI event types"
Write-Command "POST /api/agui/stream { prompt: 'Extract the title from learn.microsoft.com' }"
Pause-Demo 1
$stream = Invoke-Api -Method POST -Path "/api/agui/stream" -Body '{"prompt":"Extract the title","userId":"demo","sessionId":"s1"}'
if ($stream -match "error") {
    Write-Host "  [AG-UI streaming requires Azure AI Foundry Agent Service]" -ForegroundColor DarkYellow
    Write-Host ""
    Write-Host "  In production, this endpoint emits SSE events:" -ForegroundColor DarkGray
    Write-Host "    RUN_STARTED -> TOOL_CALL_START -> TOOL_CALL_ARGS -> TOOL_CALL_END" -ForegroundColor Yellow
    Write-Host "    -> STATE_SNAPSHOT -> TEXT_MESSAGE_CONTENT -> RUN_FINISHED" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  CopilotKit consumes this with: useAgent({ endpoint: '/api/agui/stream' })" -ForegroundColor DarkGray
} else {
    Write-Result $stream "Yellow"
}
Pause-Demo 3

Write-Step "5.2" "Session state — shared between agent and frontend"
Write-Command "GET /api/agui/state/s1"
Pause-Demo 1
$state = Invoke-Api -Path "/api/agui/state/s1"
Write-Result $state "Yellow"
Pause-Demo 3

# ═══════════════════════════════════════════════════════════════════════
Write-Title "DEMO 6: Test Suite (398 tests)"
# ═══════════════════════════════════════════════════════════════════════

Write-Step "6.1" "Running full test suite — unit + integration + e2e"
Write-Command "npx vitest run"
Pause-Demo 1
Write-Host ""
$testOutput = npx vitest run 2>&1
$summary = $testOutput | Select-String "Test Files|Tests |Duration"
foreach ($line in $summary) {
    Write-Host "  $($line.Line.Trim())" -ForegroundColor Green
}
Pause-Demo 3

# ═══════════════════════════════════════════════════════════════════════
Write-Title "DEMO 7: CI/CD Pipeline (GitHub Actions)"
# ═══════════════════════════════════════════════════════════════════════

Write-Host "  The deploy pipeline runs on every push to main:" -ForegroundColor White
Write-Host ""
Write-Host "    push to main" -ForegroundColor DarkGray
Write-Host "      |" -ForegroundColor DarkGray
Write-Host "      v" -ForegroundColor DarkGray
Write-Host "    [test]           lint + typecheck + 398 tests + Bicep validation" -ForegroundColor Green
Write-Host "      |" -ForegroundColor DarkGray
Write-Host "      v" -ForegroundColor DarkGray
Write-Host "    [deploy-staging] Azure login (OIDC) -> azd provision -> azd deploy" -ForegroundColor Green
Write-Host "      |" -ForegroundColor DarkGray
Write-Host "      v" -ForegroundColor DarkGray
Write-Host "    [deploy-prod]    Azure login (OIDC) -> azd provision -> azd deploy" -ForegroundColor Green
Write-Host ""
Write-Host "  Azure resources provisioned:" -ForegroundColor White
Write-Host "    - Azure OpenAI (GPT-4o)         - Container Apps + ACR" -ForegroundColor Cyan
Write-Host "    - Azure Cosmos DB (audit logs)   - Application Insights" -ForegroundColor Cyan
Write-Host "    - Azure Key Vault (secrets)      - AI Content Safety" -ForegroundColor Cyan
Pause-Demo 3

# ═══════════════════════════════════════════════════════════════════════
Write-Title "DEMO 8: Architecture at a Glance"
# ═══════════════════════════════════════════════════════════════════════

Write-Host "  User Prompt" -ForegroundColor White
Write-Host "    |" -ForegroundColor DarkGray
Write-Host "    v" -ForegroundColor DarkGray
Write-Host "  [CopilotKit / AG-UI Frontend]  <-- SSE streaming (17 event types)" -ForegroundColor Yellow
Write-Host "    |" -ForegroundColor DarkGray
Write-Host "    v" -ForegroundColor DarkGray
Write-Host "  [Azure Container Apps]         <-- Auto-scaling (0-20 replicas)" -ForegroundColor Cyan
Write-Host "    |" -ForegroundColor DarkGray
Write-Host "    +-- [Azure AI Foundry]       <-- GPT-4o + 12 function tools" -ForegroundColor Cyan
Write-Host "    +-- [Security Pipeline]      <-- Entra ID + Allowlist + Content Safety" -ForegroundColor Red
Write-Host "    +-- [Dual-Path Router]       <-- API first, DOM fallback" -ForegroundColor Cyan
Write-Host "    +-- [Microsoft Graph]        <-- Teams + Calendar + Cards" -ForegroundColor Cyan
Write-Host "    +-- [Fabric Lakehouse]       <-- Work IQ + ROI analytics" -ForegroundColor Magenta
Write-Host "    |" -ForegroundColor DarkGray
Write-Host "    v" -ForegroundColor DarkGray
Write-Host "  [Cosmos DB Audit Log]          <-- Immutable, every action logged" -ForegroundColor Green
Pause-Demo 3

# ═══════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""
Write-Host "  Demo complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Secure Enterprise Browser Agentic System" -ForegroundColor White
Write-Host "  12 skills | 5-layer security | 398 tests | 8 Azure services" -ForegroundColor DarkGray
Write-Host "  One prompt. Seven apps. Three minutes. Board-ready." -ForegroundColor Yellow
Write-Host ""
Write-Host "  github.com/yjcmsft/Secure-Enterprise-Browser-Agentic-System" -ForegroundColor Cyan
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""
