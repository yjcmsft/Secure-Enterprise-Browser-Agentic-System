export type SkillName =
  | "navigate_page"
  | "extract_content"
  | "fill_form"
  | "submit_action"
  | "discover_apis"
  | "capture_screenshot"
  | "compare_data"
  | "orchestrate_workflow"
  | "send_teams_message"
  | "create_adaptive_card"
  | "manage_calendar"
  | "analyze_work_patterns";

export interface SkillExecutionContext {
  userId: string;
  sessionId: string;
  conversationId?: string;
  requestId?: string;
  requiresApproval?: boolean;
  graphAccessToken?: string;
}

export interface SkillResult<T = unknown> {
  skill: SkillName;
  success: boolean;
  data?: T;
  error?: string;
  path?: "api" | "dom" | "graph";
  durationMs: number;
}

export interface SkillInvocation {
  skill: SkillName;
  params: Record<string, unknown>;
}

export interface WorkflowPlan {
  steps: SkillInvocation[];
  parallelGroups?: SkillInvocation[][];
}

export type SkillHandler = (
  params: Record<string, unknown>,
  context: SkillExecutionContext,
) => Promise<SkillResult>;
