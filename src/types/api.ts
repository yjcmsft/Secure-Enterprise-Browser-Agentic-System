export interface DiscoveredEndpoint {
  method: string;
  path: string;
  description?: string;
  parameters?: string[];
}

export interface ApiSchema {
  sourceUrl: string;
  type: "openapi" | "swagger" | "graphql";
  endpoints: DiscoveredEndpoint[];
  discoveredAt: number;
}

export interface NormalizedResponse {
  status: number;
  data: Record<string, unknown> | Record<string, unknown>[];
  pagination?: {
    nextToken?: string;
    hasMore?: boolean;
  };
}

export interface DualPathDecision {
  path: "api" | "dom";
  reason: string;
}
