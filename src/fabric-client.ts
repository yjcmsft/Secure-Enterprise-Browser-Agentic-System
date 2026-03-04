/**
 * Microsoft Fabric integration — streams audit logs and agent analytics to a
 * Fabric Lakehouse via the Fabric REST API.
 *
 * Architecture:
 *   Audit Logger → FabricClient → Fabric Lakehouse (OneLake)
 *   Work Patterns → WorkIQConnector → Fabric Data Pipeline
 *
 * The FabricClient authenticates via Azure Entra ID (DefaultAzureCredential)
 * and uses the Fabric REST API to:
 *   1. Load audit events into a Lakehouse table
 *   2. Trigger data pipelines for analytics
 *   3. Query Work IQ productivity metrics
 */

import { DefaultAzureCredential, type TokenCredential } from "@azure/identity";
import axios, { type AxiosInstance } from "axios";
import { createLogger, format, transports } from "winston";
import { config } from "./config.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const FABRIC_API_BASE = "https://api.fabric.microsoft.com/v1";
const FABRIC_SCOPE = "https://api.fabric.microsoft.com/.default";

// ---------------------------------------------------------------------------
// Configuration — set via environment variables
// ---------------------------------------------------------------------------

export interface FabricConfig {
  workspaceId: string;
  lakehouseId: string;
  pipelineId?: string;
  enabled: boolean;
}

export function getFabricConfig(): FabricConfig {
  return {
    workspaceId: process.env.FABRIC_WORKSPACE_ID ?? "",
    lakehouseId: process.env.FABRIC_LAKEHOUSE_ID ?? "",
    pipelineId: process.env.FABRIC_PIPELINE_ID,
    enabled: process.env.FABRIC_ENABLED === "true",
  };
}

// ---------------------------------------------------------------------------
// FabricClient — REST API wrapper for Microsoft Fabric
// ---------------------------------------------------------------------------

export class FabricClient {
  private readonly credential: TokenCredential;
  private httpClient?: AxiosInstance;
  private readonly fabricConfig: FabricConfig;

  public constructor(fabricConfigOverride?: FabricConfig, credentialOverride?: TokenCredential) {
    this.credential = credentialOverride ?? new DefaultAzureCredential();
    this.fabricConfig = fabricConfigOverride ?? getFabricConfig();
  }

  public isEnabled(): boolean {
    return (
      this.fabricConfig.enabled &&
      this.fabricConfig.workspaceId.length > 0 &&
      this.fabricConfig.lakehouseId.length > 0
    );
  }

  /**
   * Acquire a Fabric API token and create an authenticated HTTP client.
   */
  private async getHttpClient(): Promise<AxiosInstance> {
    if (this.httpClient) return this.httpClient;

    const token = await this.credential.getToken(FABRIC_SCOPE);
    if (!token?.token) {
      throw new Error("Unable to acquire Fabric API token");
    }

    this.httpClient = axios.create({
      baseURL: FABRIC_API_BASE,
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    });

    return this.httpClient;
  }

  /**
   * Load rows into a Fabric Lakehouse table via the Tables API.
   * Uses the Lakehouse Table Load API to append rows.
   */
  public async loadTableRows(
    tableName: string,
    rows: Record<string, unknown>[],
  ): Promise<{ rowsLoaded: number }> {
    if (!this.isEnabled()) {
      logger.debug("fabric-skipped", { reason: "Fabric not enabled" });
      return { rowsLoaded: 0 };
    }

    const client = await this.getHttpClient();
    const { workspaceId, lakehouseId } = this.fabricConfig;

    const url = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/tables/${tableName}/load`;

    await client.post(url, {
      relativePath: `Tables/${tableName}`,
      pathType: "File",
      mode: "Append",
      data: rows,
    });

    logger.info("fabric-table-loaded", { tableName, rowCount: rows.length });
    return { rowsLoaded: rows.length };
  }

  /**
   * Trigger a Fabric Data Pipeline run for analytics processing.
   */
  public async triggerPipeline(
    pipelineId?: string,
  ): Promise<{ runId: string } | null> {
    if (!this.isEnabled()) return null;

    const id = pipelineId ?? this.fabricConfig.pipelineId;
    if (!id) {
      logger.warn("fabric-pipeline-skipped", { reason: "No pipeline ID configured" });
      return null;
    }

    const client = await this.getHttpClient();
    const { workspaceId } = this.fabricConfig;

    const response = await client.post(
      `/workspaces/${workspaceId}/items/${id}/jobs/instances?jobType=Pipeline`,
    );

    const runId = String(
      (response.data as Record<string, unknown>)?.id ?? "unknown",
    );
    logger.info("fabric-pipeline-triggered", { pipelineId: id, runId });
    return { runId };
  }

  /**
   * Query a Fabric Lakehouse SQL analytics endpoint.
   */
  public async queryAnalytics(
    sqlQuery: string,
  ): Promise<Record<string, unknown>[]> {
    if (!this.isEnabled()) return [];

    const client = await this.getHttpClient();
    const { workspaceId, lakehouseId } = this.fabricConfig;

    const response = await client.post(
      `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/queries`,
      { query: sqlQuery, maxRows: 1000 },
    );

    return (response.data as { results: Record<string, unknown>[] }).results ?? [];
  }

  /**
   * Reset the cached HTTP client (useful for token refresh).
   */
  public resetClient(): void {
    this.httpClient = undefined;
  }
}
