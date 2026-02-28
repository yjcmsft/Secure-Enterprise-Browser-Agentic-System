import { CosmosClient, type Container } from "@azure/cosmos";
import { config } from "../config.js";

export interface MemoryRecord {
  id: string;
  sessionId: string;
  conversationId?: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}

export class MemoryStore {
  private readonly cache = new Map<string, MemoryRecord>();
  private container?: Container;

  public constructor() {
    if (config.COSMOS_ENDPOINT && config.COSMOS_KEY) {
      const cosmos = new CosmosClient({ endpoint: config.COSMOS_ENDPOINT, key: config.COSMOS_KEY });
      this.container = cosmos.database(config.COSMOS_DATABASE).container(config.COSMOS_MEMORY_CONTAINER);
    }
  }

  public async set(record: MemoryRecord): Promise<void> {
    this.cache.set(record.id, record);
    if (this.container) {
      await this.container.items.upsert(record);
    }
  }

  public get(id: string): MemoryRecord | undefined {
    return this.cache.get(id);
  }
}
