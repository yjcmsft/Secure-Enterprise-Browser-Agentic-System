import express from "express";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createLogger, format, transports } from "winston";
import { handleAgUiStream, getSessionState } from "./agui-handler.js";
import { config } from "./config.js";
import { startFoundryAgent, stopFoundryAgent } from "./foundry-agent.js";
import { TaskPlanner } from "./orchestrator/task-planner.js";
import { ToolRouter } from "./orchestrator/tool-router.js";
import { runtime, sessionManager } from "./runtime.js";
import { isSecurityError } from "./security/errors.js";

import { featureFlags } from "./feature-flags.js";

const app = express();
const planner = new TaskPlanner();
const toolRouter = new ToolRouter();

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

app.use(express.json({ limit: "2mb" }));

// CORS — allow frontend to call API from different origin
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, x-request-id");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (_req.method === "OPTIONS") { res.sendStatus(200); return; }
  next();
});

// ---------------------------------------------------------------------------
// Rate limiting — protects all API endpoints from abuse
// ---------------------------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,            // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

app.use("/api/", apiLimiter);

function resolveRequestId(req: express.Request, res: express.Response): string {
  const requestIdFromHeader = req.headers["x-request-id"];
  const requestId =
    (Array.isArray(requestIdFromHeader) ? requestIdFromHeader[0] : requestIdFromHeader) ??
    (typeof req.body?.requestId === "string" ? req.body.requestId : randomUUID());
  res.setHeader("x-request-id", requestId);
  return requestId;
}

// Serve the interactive demo UI at /demo (same-origin avoids CORS issues)
app.get("/demo", (_req, res) => {
  res.sendFile(resolve(process.cwd(), "frontend", "index.html"));
});

app.get("/", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Secure Enterprise Browser Agent</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center}
  .card{max-width:720px;padding:3rem;background:#1e293b;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,.5)}
  h1{font-size:1.8rem;margin-bottom:.5rem;color:#38bdf8}
  .tagline{color:#94a3b8;margin-bottom:2rem;font-size:1.1rem}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:.75rem;font-weight:600;margin:0 4px 8px 0}
  .b-blue{background:#1e3a5f;color:#38bdf8} .b-green{background:#14532d;color:#4ade80}
  .b-purple{background:#3b0764;color:#c084fc} .b-yellow{background:#422006;color:#facc15}
  h2{font-size:1.1rem;margin:1.5rem 0 .75rem;color:#f1f5f9}
  table{width:100%;border-collapse:collapse;margin-bottom:1.5rem}
  th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #334155;font-size:.85rem}
  th{color:#94a3b8;font-weight:500} td{color:#cbd5e1}
  code{background:#334155;padding:2px 8px;border-radius:4px;font-size:.8rem;color:#38bdf8}
  a{color:#38bdf8;text-decoration:none} a:hover{text-decoration:underline}
  .footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #334155;color:#64748b;font-size:.8rem;text-align:center}
</style></head><body>
<div class="card">
  <h1>&#127760; Secure Enterprise Browser Agent</h1>
  <p class="tagline">One prompt. Seven apps. Three minutes. Board-ready.</p>
  <span class="badge b-blue">Azure AI Foundry</span>
  <span class="badge b-purple">AG-UI Streaming</span>
  <span class="badge b-green">398 Tests Passing</span>
  <span class="badge b-yellow">12 Skills</span>

  <h2>API Endpoints</h2>
  <table>
    <tr><th>Method</th><th>Path</th><th>Description</th></tr>
    <tr><td>GET</td><td><a href="/health"><code>/health</code></a></td><td>Health check</td></tr>
    <tr><td>GET</td><td><a href="/ready"><code>/ready</code></a></td><td>Readiness probe</td></tr>
    <tr><td>POST</td><td><code>/api/skills/:name</code></td><td>Invoke a skill (navigate, extract, fill, submit...)</td></tr>
    <tr><td>POST</td><td><code>/api/workflow</code></td><td>Multi-step workflow from natural language</td></tr>
    <tr><td>POST</td><td><code>/api/agui/stream</code></td><td>AG-UI SSE streaming (CopilotKit)</td></tr>
    <tr><td>GET</td><td><code>/api/agui/state/:id</code></td><td>Session state</td></tr>
    <tr><td>POST</td><td><code>/api/approve/:id</code></td><td>Approve/deny write actions</td></tr>
  </table>

  <h2>Quick Test</h2>
  <table>
    <tr><td colspan="2"><code>curl <a href="/health">/health</a></code></td></tr>
    <tr><td colspan="2"><code>curl -X POST /api/skills/navigate_page -H "Content-Type: application/json" -d '{"userId":"demo","sessionId":"s1","params":{"url":"https://learn.microsoft.com"}}'</code></td></tr>
  </table>

  <div class="footer">
    <a href="/demo" style="display:inline-block;padding:10px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:12px">&#127760; Open Interactive Demo UI</a>
    <br>
    Powered by Azure AI Foundry &bull; AG-UI Protocol &bull; Playwright &bull; Express
    <br><a href="https://github.com/yjcmsft/Secure-Enterprise-Browser-Agentic-System">GitHub Repository</a>
  </div>
</div>
</body></html>`);
});

app.get("/health", (req, res) => {
  const requestId = resolveRequestId(req, res);
  res.status(200).json({ requestId, status: "healthy" });
});

app.get("/api/features", (_req, res) => {
  res.status(200).json(featureFlags);
});

app.get("/ready", async (req, res) => {
  const requestId = resolveRequestId(req, res);
  try {
    await runtime.browserPool.getBrowser();
    const dependencies = await runtime.securityGate.checkReadiness();
    res.status(200).json({
      requestId,
      status: "ready",
      dependencies: {
        browser: "ready",
        ...dependencies,
      },
    });
  } catch (error) {
    res.status(503).json({
      requestId,
      status: "not_ready",
      error: (error as Error).message,
    });
  }
});

app.post("/api/skills/:skillName", async (req, res) => {
  const startedAt = Date.now();
  const requestId = resolveRequestId(req, res);

  const { skillName } = req.params;
  const { params, userId, sessionId, conversationId } = req.body as {
    params: Record<string, unknown>;
    userId: string;
    sessionId: string;
    conversationId?: string;
    requestId?: string;
    graphAccessToken?: string;
  };

  try {
    const result = await toolRouter.run(skillName, params ?? {}, {
      userId: userId ?? "anonymous",
      sessionId: sessionId ?? "default-session",
      conversationId,
      requestId,
      graphAccessToken: req.body.graphAccessToken,
    });
    res.status(result.success ? 200 : 400).json({ requestId, ...result });
  } catch (error) {
    const isKnownSecurityError = isSecurityError(error);
    logger.error("skill_execution_failed", {
      skillName,
      requestId,
      durationMs: Date.now() - startedAt,
      error: (error as Error).message,
      errorCode: isKnownSecurityError ? error.code : undefined,
    });
    if (isKnownSecurityError) {
      res.status(error.httpStatus).json({
        requestId,
        error: error.message,
        code: error.code,
        details: error.details,
      });
      return;
    }

    res.status(500).json({ requestId, error: (error as Error).message });
  }
});

app.post("/api/approve/:actionId", (req, res) => {
  const requestId = resolveRequestId(req, res);
  const actionId = req.params.actionId;
  const approved = Boolean(req.body.approved);
  const resolved = runtime.securityGate.getApprovalGate().resolveApproval({
    actionId,
    approved,
    responderId: req.body.responderId,
    note: req.body.note,
    resolvedAt: new Date().toISOString(),
  });
  res.status(resolved ? 200 : 404).json({ requestId, resolved });
});

app.post("/api/workflow", async (req, res) => {
  const requestId = resolveRequestId(req, res);

  const { prompt, userId, sessionId } = req.body as {
    prompt: string;
    userId: string;
    sessionId: string;
    requestId?: string;
    graphAccessToken?: string;
  };
  const plan = await planner.createPlan(prompt);
  const result = await toolRouter.run(
    "orchestrate_workflow",
    { steps: plan.steps },
    {
      userId: userId ?? "anonymous",
      sessionId: sessionId ?? "workflow-session",
      requestId,
      graphAccessToken: req.body.graphAccessToken,
    },
  );
  res.status(result.success ? 200 : 400).json({ requestId, plan, result });
});

// ---------------------------------------------------------------------------
// AG-UI SSE streaming endpoint — CopilotKit / AG-UI compatible frontends
// ---------------------------------------------------------------------------
app.post("/api/agui/stream", (req, res) => {
  void handleAgUiStream(req, res);
});

app.get("/api/agui/state/:sessionId", (req, res) => {
  const requestId = resolveRequestId(req, res);
  const state = getSessionState(req.params.sessionId);
  res.status(200).json({ requestId, state: state ?? {} });
});

// ---------------------------------------------------------------------------
// Agent lifecycle — start Azure AI Foundry agent if configured
// ---------------------------------------------------------------------------
async function startAgent(): Promise<void> {
  if (config.AZURE_AI_PROJECT_ENDPOINT) {
    try {
      await startFoundryAgent();
      logger.info("Azure AI Foundry agent started successfully");
    } catch (err) {
      const error = err as Error & { statusCode?: number; code?: string; details?: unknown };
      logger.warn("Foundry agent start skipped (will use REST API only)", {
        error: error.message ?? String(err),
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack?.split("\n").slice(0, 3).join(" | "),
      });
    }
  }
}

const server = app.listen(config.PORT, () => {
  logger.info(`Server listening on port ${config.PORT}`);
  void startAgent();
});

async function shutdown(): Promise<void> {
  await stopFoundryAgent();
  await sessionManager.closeAll();
  await runtime.browserPool.close();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => {
  void shutdown();
});

process.on("SIGINT", () => {
  void shutdown();
});
