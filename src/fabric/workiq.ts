/**
 * Work IQ / Fabric IQ Connector — bridges agent productivity metrics with
 * Microsoft Viva Insights / Work IQ via the Fabric Lakehouse.
 *
 * Computes agent-driven productivity gains:
 *   - Time saved by browser automation (vs manual clicks)
 *   - Error reduction from API-first routing
 *   - Focus time recovered by eliminating context switching
 *   - Collaboration velocity from automated notifications
 *
 * These metrics feed into Fabric IQ dashboards and Viva Insights reports.
 */

import { createLogger, format, transports } from "winston";
import { FabricClient, type FabricConfig } from "./client.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// ---------------------------------------------------------------------------
// Productivity Metric Types
// ---------------------------------------------------------------------------

export interface ProductivityMetrics {
  timeSavedMinutes: number;
  errorReductionPercent: number;
  focusTimeRecoveredMinutes: number;
  collaborationVelocity: number;
  automatedWorkflows: number;
  manualStepsEliminated: number;
}

export interface WorkIQEvent {
  userId: string;
  timestamp: string;
  metricType: "time_saved" | "error_prevented" | "focus_recovered" | "workflow_completed";
  value: number;
  unit: string;
  source: "browser_agent";
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Benchmark: estimated manual time per skill (in seconds)
// ---------------------------------------------------------------------------

const MANUAL_TIME_ESTIMATES: Record<string, number> = {
  navigate_page: 15,
  extract_content: 45,
  fill_form: 60,
  submit_action: 30,
  discover_apis: 120,
  capture_screenshot: 20,
  compare_data: 180,
  orchestrate_workflow: 300,
  send_teams_message: 30,
  create_adaptive_card: 60,
  manage_calendar: 45,
  analyze_work_patterns: 90,
};

// ---------------------------------------------------------------------------
// WorkIQConnector
// ---------------------------------------------------------------------------

export class WorkIQConnector {
  private readonly client: FabricClient;

  public constructor(
    fabricConfigOrClient?: FabricConfig | FabricClient,
  ) {
    this.client =
      fabricConfigOrClient instanceof FabricClient
        ? fabricConfigOrClient
        : new FabricClient(fabricConfigOrClient as FabricConfig | undefined);
  }

  /**
   * Calculate time saved for a given skill execution.
   */
  public calculateTimeSaved(
    skillName: string,
    actualDurationMs: number,
  ): { savedSeconds: number; manualEstimateSeconds: number } {
    const manualEstimate = MANUAL_TIME_ESTIMATES[skillName] ?? 30;
    const actualSeconds = actualDurationMs / 1000;
    const savedSeconds = Math.max(0, manualEstimate - actualSeconds);
    return { savedSeconds, manualEstimateSeconds: manualEstimate };
  }

  /**
   * Record a productivity event to the Fabric Lakehouse.
   */
  public async recordProductivityEvent(event: WorkIQEvent): Promise<void> {
    try {
      await this.client.loadTableRows("work_iq_events", [event as unknown as Record<string, unknown>]);
      logger.info("workiq-event-recorded", { metricType: event.metricType, value: event.value });
    } catch (err) {
      logger.error("workiq-event-error", { error: (err as Error).message });
    }
  }

  /**
   * Record a workflow completion with computed productivity metrics.
   */
  public async recordWorkflowCompletion(
    userId: string,
    skillName: string,
    durationMs: number,
    success: boolean,
  ): Promise<ProductivityMetrics> {
    const { savedSeconds, manualEstimateSeconds } = this.calculateTimeSaved(skillName, durationMs);

    const metrics: ProductivityMetrics = {
      timeSavedMinutes: Math.round(savedSeconds / 60 * 100) / 100,
      errorReductionPercent: success ? 95 : 0,
      focusTimeRecoveredMinutes: Math.round(savedSeconds / 60 * 100) / 100,
      collaborationVelocity: success ? 1 : 0,
      automatedWorkflows: 1,
      manualStepsEliminated: success ? 1 : 0,
    };

    const event: WorkIQEvent = {
      userId,
      timestamp: new Date().toISOString(),
      metricType: "workflow_completed",
      value: savedSeconds,
      unit: "seconds",
      source: "browser_agent",
      metadata: {
        skillName,
        durationMs,
        success,
        manualEstimateSeconds,
        ...metrics,
      },
    };

    await this.recordProductivityEvent(event);
    return metrics;
  }

  /**
   * Query aggregated productivity insights from Fabric.
   */
  public async getProductivityInsights(
    userId?: string,
  ): Promise<Record<string, unknown>[]> {
    const whereClause = userId ? `WHERE userId = '${userId}'` : "";
    return this.client.queryAnalytics(`
      SELECT metricType,
             SUM(value) as total_value,
             COUNT(*) as event_count,
             AVG(value) as avg_value
      FROM work_iq_events
      ${whereClause}
      GROUP BY metricType
      ORDER BY total_value DESC
    `);
  }

  /**
   * Get the manual time estimate for a skill.
   */
  public getManualEstimate(skillName: string): number {
    return MANUAL_TIME_ESTIMATES[skillName] ?? 30;
  }
}
