import { SchemaDiscovery } from "./schema-discovery.js";
import type { DualPathDecision } from "../types/api.js";

export class DualPathRouter {
  private readonly discovery = new SchemaDiscovery();

  public async decide(url: string): Promise<DualPathDecision> {
    const target = new URL(url);
    const base = `${target.protocol}//${target.host}`;
    const schema = await this.discovery.discover(base);
    if (schema) {
      return { path: "api", reason: `Discovered ${schema.endpoints.length} endpoints` };
    }
    return { path: "dom", reason: "No API schema discovered" };
  }

  public getDiscovery(): SchemaDiscovery {
    return this.discovery;
  }
}
