import { randomUUID } from "node:crypto";
import { CosmosClient, type Container } from "@azure/cosmos";
import { createLogger, format, transports } from "winston";
import { config } from "../config.js";
import type { AuditLogEntry } from "../types/security.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

export class AuditLogger {
  private container?: Container;
  private readonly memoryLogs: AuditLogEntry[] = [];

  public constructor() {
    if (config.COSMOS_ENDPOINT && config.COSMOS_KEY) {
      const cosmos = new CosmosClient({ endpoint: config.COSMOS_ENDPOINT, key: config.COSMOS_KEY });
      this.container = cosmos
        .database(config.COSMOS_DATABASE)
        .container(config.COSMOS_AUDIT_CONTAINER);
    }
  }

  public async log(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<void> {
    const payload: AuditLogEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    if (this.container) {
      await this.container.items.create(payload);
    } else {
      this.memoryLogs.push(payload);
    }

    logger.info("audit", payload);
  }

  public async checkReadiness(): Promise<{ auditStore: "ready" | "skipped" }> {
    if (!this.container) {
      return { auditStore: "skipped" };
    }

    await this.container.read();
    return { auditStore: "ready" };
  }

  public getInMemoryLogs(): AuditLogEntry[] {
    return this.memoryLogs;
  }
}
