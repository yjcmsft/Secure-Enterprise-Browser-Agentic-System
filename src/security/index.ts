import { ApprovalGate } from "./approval-gate.js";
import { AuditLogger } from "./audit-logger.js";
import { AuthDelegation } from "./auth-delegation.js";
import { ContentSafetyGuard } from "./content-safety.js";
import { SecurityError } from "./errors.js";
import { UrlAllowlist } from "./url-allowlist.js";
import type { SkillExecutionContext, SkillName } from "../types/skills.js";
import type { SecurityErrorCode } from "../types/security.js";

export class SecurityGate {
  private readonly allowlist: UrlAllowlist;
  private readonly auth = new AuthDelegation();
  private readonly approval = new ApprovalGate();
  private readonly audit = new AuditLogger();
  private readonly safety = new ContentSafetyGuard();

  public constructor(patterns: string[]) {
    this.allowlist = new UrlAllowlist(patterns);
  }

  public async executeWithSecurity<T>(
    skill: SkillName,
    params: Record<string, unknown>,
    context: SkillExecutionContext,
    handler: (token: string) => Promise<{ data: T; path: "api" | "dom" | "graph" }>,
  ): Promise<{ data: T; path: "api" | "dom" | "graph" }> {
    const start = Date.now();
    const approvalRequired = this.approval.requiresApproval(skill);
    let approvalGranted = !approvalRequired;

    const deny = async (
      code: SecurityErrorCode,
      message: string,
      details?: Record<string, unknown>,
      path: "api" | "dom" | "graph" = "dom",
    ): Promise<never> => {
      await this.audit.log({
        requestId: context.requestId,
        conversationId: context.conversationId,
        userId: context.userId,
        sessionId: context.sessionId,
        skillName: skill,
        action: skill,
        params,
        result: {
          success: false,
          error: message,
          ...(details ?? {}),
        },
        durationMs: Date.now() - start,
        path,
        approvalRequired,
        approved: approvalGranted,
        errorCode: code,
        deniedReason: message,
      });

      throw new SecurityError(code, message, 403, details);
    };

    const url = typeof params.url === "string" ? params.url : undefined;
    if (url && !this.allowlist.isAllowed(url)) {
      await deny("URL_NOT_ALLOWED", "URL blocked by allowlist", { url });
    }

    const inputResult = await this.safety.screenInput(JSON.stringify(params));
    if (!inputResult.allowed) {
      await deny("INPUT_BLOCKED", "Input blocked by content safety policy", {
        blockedCategories: inputResult.blockedCategories,
      });
    }

    if (approvalRequired) {
      const resolution = await this.approval.requestApproval(
        skill,
        context.userId,
        context.sessionId,
        `Approval required for ${skill}`,
      );
      if (!resolution.approved) {
        await deny("APPROVAL_DENIED", "Action denied or timed out", {
          actionId: resolution.actionId,
          note: resolution.note,
        });
      }
      approvalGranted = true;
    }

    const token = await this.auth.getDelegatedToken(skill);
    const result = await handler(token);

    const outputResult = await this.safety.screenOutput(JSON.stringify(result.data));
    if (!outputResult.allowed) {
      await deny("OUTPUT_BLOCKED", "Output blocked by content safety policy", {
        blockedCategories: outputResult.blockedCategories,
      }, result.path);
    }

    await this.audit.log({
      requestId: context.requestId,
      conversationId: context.conversationId,
      userId: context.userId,
      sessionId: context.sessionId,
      skillName: skill,
      action: skill,
      params,
      result: { success: true },
      durationMs: Date.now() - start,
      path: result.path,
      approvalRequired,
      approved: approvalGranted,
    });

    let redactedData = result.data;
    if (outputResult.redactedText) {
      try {
        redactedData = JSON.parse(outputResult.redactedText) as T;
      } catch {
        redactedData = result.data;
      }
    }

    return {
      data: redactedData,
      path: result.path,
    };
  }

  public getApprovalGate(): ApprovalGate {
    return this.approval;
  }

  public getAuditLogger(): AuditLogger {
    return this.audit;
  }

  public async checkReadiness(): Promise<{
    keyVault: "ready" | "skipped";
    auditStore: "ready" | "skipped";
  }> {
    const [authReadiness, auditReadiness] = await Promise.all([
      this.auth.checkReadiness(),
      this.audit.checkReadiness(),
    ]);

    return {
      keyVault: authReadiness.keyVault,
      auditStore: auditReadiness.auditStore,
    };
  }
}
