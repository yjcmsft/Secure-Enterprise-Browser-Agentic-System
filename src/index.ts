import express from "express";
import { randomUUID } from "node:crypto";
import { createLogger, format, transports } from "winston";
import { config } from "./config.js";
import { TaskPlanner } from "./orchestrator/task-planner.js";
import { ToolRouter } from "./orchestrator/tool-router.js";
import { runtime, sessionManager } from "./runtime.js";
import { isSecurityError } from "./security/errors.js";

const app = express();
const planner = new TaskPlanner();
const toolRouter = new ToolRouter();

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

app.use(express.json({ limit: "2mb" }));

function resolveRequestId(req: express.Request, res: express.Response): string {
  const requestIdFromHeader = req.headers["x-request-id"];
  const requestId =
    (Array.isArray(requestIdFromHeader) ? requestIdFromHeader[0] : requestIdFromHeader) ??
    (typeof req.body?.requestId === "string" ? req.body.requestId : randomUUID());
  res.setHeader("x-request-id", requestId);
  return requestId;
}

app.get("/health", (req, res) => {
  const requestId = resolveRequestId(req, res);
  res.status(200).json({ requestId, status: "healthy" });
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

const server = app.listen(config.PORT, () => {
  logger.info(`Server listening on port ${config.PORT}`);
});

async function shutdown(): Promise<void> {
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
