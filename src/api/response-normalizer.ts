import type { NormalizedResponse } from "../types/api.js";

export class ResponseNormalizer {
  public normalize(status: number, data: unknown): NormalizedResponse {
    if (typeof data === "string") {
      return { status, data: { text: data } };
    }

    if (Array.isArray(data)) {
      return { status, data: data as Record<string, unknown>[] };
    }

    if (typeof data === "object" && data !== null) {
      return { status, data: data as Record<string, unknown> };
    }

    return {
      status,
      data: { value: data as unknown },
    };
  }
}
