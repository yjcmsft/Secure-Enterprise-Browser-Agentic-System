/**
 * Fabric Analytics Pipeline — streams agent audit logs and workflow metrics
 * to a Microsoft Fabric Lakehouse for enterprise analytics dashboards.
 *
 * This module bridges the audit logger and workflow engine with Fabric:
 *   - Audit events → Fabric Lakehouse "audit_events" table
 *   - Skill metrics → Fabric Lakehouse "skill_metrics" table
 *   - Periodic pipeline trigger for ML analytics (bottleneck detection, cost optimization)
 */

import { createLogger, format, transports } from "winston";
import { FabricClient, type FabricConfig } from "./client.js";
import type { AuditLogEntry } from "../types/security.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// ---------------------------------------------------------------------------
// Buffered audit event streaming
// ---------------------------------------------------------------------------

const DEFAULT_FLUSH_INTERVAL_MS = 30_000;
const DEFAULT_BUFFER_SIZE = 100;

export interface AnalyticsPipelineOptions {
  flushIntervalMs?: number;
  maxBufferSize?: number;
}

export class AnalyticsPipeline {
  private readonly client: FabricClient;
  private readonly auditBuffer: AuditLogEntry[] = [];
  private readonly skillMetricsBuffer: SkillMetric[] = [];
  private flushTimer?: ReturnType<typeof setInterval>;
  private readonly flushIntervalMs: number;
  private readonly maxBufferSize: number;

  public constructor(
    fabricConfigOrClient?: FabricConfig | FabricClient,
    options?: AnalyticsPipelineOptions,
  ) {
    this.client =
      fabricConfigOrClient instanceof FabricClient
        ? fabricConfigOrClient
        : new FabricClient(fabricConfigOrClient as FabricConfig | undefined);
    this.flushIntervalMs = options?.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.maxBufferSize = options?.maxBufferSize ?? DEFAULT_BUFFER_SIZE;
  }

  /**
   * Start periodic flush to Fabric. Idempotent — calling multiple times is safe.
   */
  public start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
    logger.info("fabric-analytics-pipeline-started", { flushIntervalMs: this.flushIntervalMs });
  }

  /**
   * Stop periodic flush and perform final drain.
   */
  public async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
    logger.info("fabric-analytics-pipeline-stopped");
  }

  /**
   * Ingest an audit event into the buffer. Triggers auto-flush if buffer is full.
   */
  public async ingestAuditEvent(entry: AuditLogEntry): Promise<void> {
    this.auditBuffer.push(entry);

    // Derive skill metrics from the audit entry
    this.skillMetricsBuffer.push({
      skillName: entry.skillName,
      path: entry.path,
      durationMs: entry.durationMs,
      success: !entry.errorCode,
      timestamp: entry.timestamp,
      userId: entry.userId,
    });

    if (this.auditBuffer.length >= this.maxBufferSize) {
      await this.flush();
    }
  }

  /**
   * Flush buffered events to Fabric Lakehouse tables.
   */
  public async flush(): Promise<{ auditRows: number; metricRows: number }> {
    const auditBatch = this.auditBuffer.splice(0);
    const metricsBatch = this.skillMetricsBuffer.splice(0);

    let auditRows = 0;
    let metricRows = 0;

    if (auditBatch.length > 0) {
      try {
        const result = await this.client.loadTableRows(
          "audit_events",
          auditBatch as unknown as Record<string, unknown>[],
        );
        auditRows = result.rowsLoaded;
      } catch (err) {
        logger.error("fabric-audit-flush-error", { error: (err as Error).message });
        // Re-buffer failed items for retry
        this.auditBuffer.unshift(...auditBatch);
      }
    }

    if (metricsBatch.length > 0) {
      try {
        const result = await this.client.loadTableRows(
          "skill_metrics",
          metricsBatch as unknown as Record<string, unknown>[],
        );
        metricRows = result.rowsLoaded;
      } catch (err) {
        logger.error("fabric-metrics-flush-error", { error: (err as Error).message });
        this.skillMetricsBuffer.unshift(...metricsBatch);
      }
    }

    return { auditRows, metricRows };
  }

  /**
   * Trigger the Fabric analytics pipeline for downstream ML processing.
   */
  public async triggerAnalytics(): Promise<{ runId: string } | null> {
    return this.client.triggerPipeline();
  }

  /**
   * Query aggregated skill performance metrics from Fabric.
   */
  public async getSkillPerformance(): Promise<Record<string, unknown>[]> {
    return this.client.queryAnalytics(`
      SELECT skillName,
             COUNT(*) as invocation_count,
             AVG(durationMs) as avg_duration_ms,
             SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count,
             SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failure_count
      FROM skill_metrics
      GROUP BY skillName
      ORDER BY invocation_count DESC
    `);
  }

  public getBufferSize(): { audit: number; metrics: number } {
    return {
      audit: this.auditBuffer.length,
      metrics: this.skillMetricsBuffer.length,
    };
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillMetric {
  skillName: string;
  path: string;
  durationMs: number;
  success: boolean;
  timestamp: string;
  userId: string;
}
