import { createLogger, format, transports } from "winston";
import { SchemaDiscovery } from "./schema-discovery.js";
import type { DualPathDecision } from "../types/api.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

export class DualPathRouter {
  private readonly discovery = new SchemaDiscovery();

  public async decide(url: string): Promise<DualPathDecision> {
    const target = new URL(url);
    const base = `${target.protocol}//${target.host}`;
    const schema = await this.discovery.discover(base);
    if (schema) {
      const decision: DualPathDecision = {
        path: "api",
        reason: `Discovered ${schema.endpoints.length} endpoints`,
      };
      logger.info("dual-path-decision", { url: base, ...decision });
      return decision;
    }
    const decision: DualPathDecision = { path: "dom", reason: "No API schema discovered" };
    logger.info("dual-path-decision", { url: base, ...decision });
    return decision;
  }

  public getDiscovery(): SchemaDiscovery {
    return this.discovery;
  }
}
