import { analyzeWorkPatterns } from "../graph/analyze-work-patterns.js";
import { createAdaptiveCard } from "../graph/create-adaptive-card.js";
import { manageCalendar } from "../graph/manage-calendar.js";
import { sendTeamsMessage } from "../graph/send-teams-message.js";
import type { SkillHandler, SkillName } from "../types/skills.js";
import { captureScreenshot } from "./capture-screenshot.js";
import { compareData } from "./compare-data.js";
import { discoverApis } from "./discover-apis.js";
import { extractContent } from "./extract-content.js";
import { fillForm } from "./fill-form.js";
import { navigatePage } from "./navigate-page.js";
import { orchestrateWorkflow } from "./orchestrate-workflow.js";
import { submitAction } from "./submit-action.js";

const registry: Record<SkillName, SkillHandler> = {
  navigate_page: navigatePage,
  extract_content: extractContent,
  fill_form: fillForm,
  submit_action: submitAction,
  discover_apis: discoverApis,
  capture_screenshot: captureScreenshot,
  compare_data: compareData,
  orchestrate_workflow: orchestrateWorkflow,
  send_teams_message: sendTeamsMessage,
  create_adaptive_card: createAdaptiveCard,
  manage_calendar: manageCalendar,
  analyze_work_patterns: analyzeWorkPatterns,
};

export function getSkill(name: SkillName): SkillHandler | undefined {
  return registry[name];
}

export function listSkills(): SkillName[] {
  return Object.keys(registry) as SkillName[];
}
