/**
 * Multi-Tenant Support — per-tenant URL allowlists and Cosmos DB partition
 * isolation for SaaS deployments.
 *
 * Architecture:
 *   Each tenant gets:
 *   - Its own URL allowlist (which apps they can access)
 *   - Cosmos DB partition key = tenantId (data isolation)
 *   - Session scoping (userId + sessionId + tenantId)
 *   - Per-skill token delegation scoped to tenant
 *
 * Tenants are configured via tenant-config.json or the /api/tenants endpoint.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createLogger, format, transports } from "winston";
import { UrlAllowlist } from "../security/url-allowlist.js";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

export interface TenantConfig {
  tenantId: string;
  name: string;
  allowedUrls: string[];
  cosmosPartitionKey: string;
  maxConcurrency: number;
  features: {
    browserAutomation: boolean;
    secEdgarApi: boolean;
    graphIntegration: boolean;
    fabricAnalytics: boolean;
  };
}

const DEFAULT_TENANT: TenantConfig = {
  tenantId: "default",
  name: "Default Tenant",
  allowedUrls: ["*"],
  cosmosPartitionKey: "default",
  maxConcurrency: 10,
  features: {
    browserAutomation: true,
    secEdgarApi: true,
    graphIntegration: true,
    fabricAnalytics: false,
  },
};

/**
 * Multi-tenant manager — loads and caches tenant configurations.
 */
export class TenantManager {
  private readonly tenants = new Map<string, TenantConfig>();
  private readonly allowlists = new Map<string, UrlAllowlist>();

  constructor() {
    this.loadTenantsFromFile();
  }

  /**
   * Load tenant configurations from tenant-config.json if it exists.
   */
  private loadTenantsFromFile(): void {
    const filePath = resolve(process.cwd(), "tenant-config.json");
    if (!existsSync(filePath)) {
      this.tenants.set("default", DEFAULT_TENANT);
      logger.info("tenant-manager-defaults", { tenants: 1 });
      return;
    }

    try {
      const data = JSON.parse(readFileSync(filePath, "utf-8")) as TenantConfig[];
      for (const tenant of data) {
        this.tenants.set(tenant.tenantId, tenant);
        this.allowlists.set(tenant.tenantId, new UrlAllowlist(tenant.allowedUrls));
      }
      logger.info("tenant-manager-loaded", { tenants: this.tenants.size });
    } catch (error) {
      logger.warn("tenant-manager-load-error", { error: (error as Error).message });
      this.tenants.set("default", DEFAULT_TENANT);
    }
  }

  /**
   * Get tenant configuration by ID. Returns default tenant if not found.
   */
  public getTenant(tenantId: string): TenantConfig {
    return this.tenants.get(tenantId) ?? DEFAULT_TENANT;
  }

  /**
   * Get the URL allowlist for a specific tenant.
   */
  public getAllowlist(tenantId: string): UrlAllowlist {
    if (!this.allowlists.has(tenantId)) {
      const tenant = this.getTenant(tenantId);
      this.allowlists.set(tenantId, new UrlAllowlist(tenant.allowedUrls));
    }
    return this.allowlists.get(tenantId)!;
  }

  /**
   * Check if a URL is allowed for a specific tenant.
   */
  public isUrlAllowed(tenantId: string, url: string): boolean {
    return this.getAllowlist(tenantId).isAllowed(url);
  }

  /**
   * Get the Cosmos DB partition key for tenant data isolation.
   */
  public getPartitionKey(tenantId: string): string {
    return this.getTenant(tenantId).cosmosPartitionKey || tenantId;
  }

  /**
   * List all configured tenants (admin endpoint).
   */
  public listTenants(): Array<{ tenantId: string; name: string; urlCount: number }> {
    return Array.from(this.tenants.values()).map((t) => ({
      tenantId: t.tenantId,
      name: t.name,
      urlCount: t.allowedUrls.length,
    }));
  }

  /**
   * Add or update a tenant configuration at runtime.
   */
  public upsertTenant(tenant: TenantConfig): void {
    this.tenants.set(tenant.tenantId, tenant);
    this.allowlists.set(tenant.tenantId, new UrlAllowlist(tenant.allowedUrls));
    logger.info("tenant-upserted", { tenantId: tenant.tenantId, name: tenant.name });
  }
}
