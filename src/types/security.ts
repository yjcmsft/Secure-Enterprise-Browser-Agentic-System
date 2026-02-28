import type { SkillName } from "./skills.js";

export type SecurityErrorCode =
  | "URL_NOT_ALLOWED"
  | "INPUT_BLOCKED"
  | "APPROVAL_DENIED"
  | "OUTPUT_BLOCKED";

export interface SecurityDecision {
  allowed: boolean;
  reason?: string;
}

export interface ApprovalRequest {
  actionId: string;
  skill: SkillName;
  userId: string;
  sessionId: string;
  summary: string;
  expiresAt: string;
}

export interface ApprovalResolution {
  actionId: string;
  approved: boolean;
  responderId?: string;
  note?: string;
  resolvedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  requestId?: string;
  conversationId?: string;
  userId: string;
  sessionId: string;
  skillName: SkillName;
  action: string;
  params: Record<string, unknown>;
  result: Record<string, unknown>;
  durationMs: number;
  path: "api" | "dom" | "graph";
  approvalRequired: boolean;
  approved: boolean;
  errorCode?: SecurityErrorCode;
  deniedReason?: string;
}

export interface ContentSafetyResult {
  allowed: boolean;
  blockedCategories: string[];
  redactedText?: string;
}
