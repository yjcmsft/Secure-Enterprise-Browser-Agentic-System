import axios from "axios";
import { parse as parseYaml } from "yaml";
import type { ApiSchema, DiscoveredEndpoint } from "../types/api.js";

const PATHS = [
  "/api/openapi.json",
  "/swagger.json",
  "/swagger/v1/swagger.json",
  "/.well-known/api-spec",
  "/api-docs",
];

const DISCOVERY_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  schema: ApiSchema | null;
  cachedAt: number;
}

export class SchemaDiscovery {
  private readonly cache = new Map<string, CacheEntry>();

  public async discover(baseUrl: string): Promise<ApiSchema | null> {
    const normalizedBase = baseUrl.replace(/\/$/, "");
    const cached = this.cache.get(normalizedBase);
    if (cached && Date.now() - cached.cachedAt < DISCOVERY_CACHE_TTL_MS) {
      return cached.schema;
    }

    for (const path of PATHS) {
      const candidate = `${normalizedBase}${path}`;
      try {
        const response = await axios.get(candidate, { timeout: 5000 });
        const spec = typeof response.data === "string" ? parseYaml(response.data) : response.data;
        if (spec?.paths) {
          const endpoints: DiscoveredEndpoint[] = [];
          for (const [endpointPath, methods] of Object.entries(spec.paths as Record<string, unknown>)) {
            const typedMethods = methods as Record<string, { description?: string; parameters?: unknown[] }>;
            for (const [method, definition] of Object.entries(typedMethods)) {
              endpoints.push({
                method: method.toUpperCase(),
                path: endpointPath,
                description: definition.description,
                parameters: (definition.parameters ?? []).map((item) => JSON.stringify(item)),
              });
            }
          }

          const schema: ApiSchema = {
            sourceUrl: candidate,
            type: "openapi",
            endpoints,
            discoveredAt: Date.now(),
          };
          this.cache.set(normalizedBase, { schema, cachedAt: Date.now() });
          return schema;
        }
      } catch {
      }
    }

    this.cache.set(normalizedBase, { schema: null, cachedAt: Date.now() });
    return null;
  }
}
