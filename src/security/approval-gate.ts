import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import type { ApprovalRequest, ApprovalResolution } from "../types/security.js";
import type { SkillName } from "../types/skills.js";

const WRITE_SKILLS = new Set<SkillName>([
  "fill_form",
  "submit_action",
  "send_teams_message",
  "manage_calendar",
]);

interface PendingApproval {
  request: ApprovalRequest;
  resolver: (result: ApprovalResolution) => void;
}

export class ApprovalGate {
  private readonly pending = new Map<string, PendingApproval>();

  public requiresApproval(skill: SkillName): boolean {
    return WRITE_SKILLS.has(skill);
  }

  public async requestApproval(
    skill: SkillName,
    userId: string,
    sessionId: string,
    summary: string,
  ): Promise<ApprovalResolution> {
    const actionId = randomUUID();
    const expiresAt = new Date(Date.now() + config.APPROVAL_TIMEOUT_MS).toISOString();
    const request: ApprovalRequest = { actionId, skill, userId, sessionId, summary, expiresAt };

    return new Promise<ApprovalResolution>((resolve) => {
      const timeout = setTimeout(() => {
        this.resolveApproval({
          actionId,
          approved: false,
          note: "Approval timeout",
          resolvedAt: new Date().toISOString(),
        });
      }, config.APPROVAL_TIMEOUT_MS);

      this.pending.set(actionId, {
        request,
        resolver: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
      });
    });
  }

  public resolveApproval(result: ApprovalResolution): boolean {
    const pending = this.pending.get(result.actionId);
    if (!pending) {
      return false;
    }
    this.pending.delete(result.actionId);
    pending.resolver(result);
    return true;
  }

  public listPending(): ApprovalRequest[] {
    return Array.from(this.pending.values()).map((item) => item.request);
  }
}
