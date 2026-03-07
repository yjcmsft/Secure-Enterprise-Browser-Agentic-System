import { createLogger, format, transports } from "winston";
import { isSecEdgarUrl } from "./bot-detector.js";
import { SchemaDiscovery } from "./schema-discovery.js";
import type { DualPathDecision } from "../types/api.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

/**
 * Known API providers — sites where we can proactively use the API path
 * without needing to discover an OpenAPI spec via schema probing.
 */
const KNOWN_API_PROVIDERS: Array<{
  match: (url: string) => boolean;
  reason: string;
}> = [
  {
    match: isSecEdgarUrl,
    reason: "SEC EDGAR XBRL API available at data.sec.gov",
  },
];

export class DualPathRouter {
  private readonly discovery = new SchemaDiscovery();

  public async decide(url: string): Promise<DualPathDecision> {
    const target = new URL(url);
    const base = `${target.protocol}//${target.host}`;

    // Check known API providers first (no schema probe needed)
    for (const provider of KNOWN_API_PROVIDERS) {
      if (provider.match(url)) {
        const decision: DualPathDecision = {
          path: "api",
          reason: provider.reason,
        };
        logger.info("dual-path-decision", { url: base, ...decision, source: "known-provider" });
        return decision;
      }
    }

    // Fall back to schema discovery (probe for OpenAPI/Swagger)
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
