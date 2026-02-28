import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import { config } from "../config.js";
import type { SkillName } from "../types/skills.js";

const SKILL_SCOPES: Record<SkillName, string> = {
  navigate_page: "Application.Read",
  extract_content: "Application.Read",
  fill_form: "Application.ReadWrite",
  submit_action: "Application.ReadWrite.All",
  discover_apis: "Application.Read",
  capture_screenshot: "Application.Read",
  compare_data: "Application.Read",
  orchestrate_workflow: "Application.ReadWrite",
  send_teams_message: "Chat.ReadWrite",
  create_adaptive_card: "Application.Read",
  manage_calendar: "Calendars.ReadWrite",
  analyze_work_patterns: "Application.Read",
};

export class AuthDelegation {
  private readonly credential = new DefaultAzureCredential();
  private readonly keyVaultClient?: SecretClient;

  public constructor() {
    if (config.KEY_VAULT_URL) {
      this.keyVaultClient = new SecretClient(config.KEY_VAULT_URL, this.credential);
    }
  }

  public async getDelegatedToken(skill: SkillName): Promise<string> {
    const scope = SKILL_SCOPES[skill];
    const tokenScope = this.resolveTokenScope(scope);

    if (this.keyVaultClient) {
      try {
        const secret = await this.keyVaultClient.getSecret(`token-${scope.toLowerCase()}`);
        if (secret.value) {
          return secret.value;
        }
      } catch {
      }
    }

    const tokenResult = await this.credential.getToken(tokenScope);
    if (tokenResult?.token) {
      return tokenResult.token;
    }

    throw new Error(`Unable to obtain delegated token for ${skill}`);
  }

  public async checkReadiness(): Promise<{ keyVault: "ready" | "skipped" }> {
    if (!this.keyVaultClient) {
      return { keyVault: "skipped" };
    }

    try {
      await this.keyVaultClient.getSecret("__readiness_probe__");
      return { keyVault: "ready" };
    } catch (error) {
      const typedError = error as { statusCode?: number };
      if (typedError.statusCode === 404) {
        return { keyVault: "ready" };
      }
      throw new Error("Key Vault readiness check failed");
    }
  }

  private resolveTokenScope(scope: string): string {
    if (scope.startsWith("Chat.") || scope.startsWith("Calendars.")) {
      return config.GRAPH_DEFAULT_SCOPE;
    }
    return config.TARGET_APP_SCOPE;
  }
}
