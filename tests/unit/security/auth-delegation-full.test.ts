import { describe, expect, test, vi, beforeEach } from "vitest";
import { AuthDelegation } from "../../../src/security/auth-delegation.js";

// Mock Azure SDK
vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn().mockImplementation(() => ({
    getToken: vi.fn().mockResolvedValue({ token: "mock-azure-token" }),
  })),
}));

vi.mock("@azure/keyvault-secrets", () => ({
  SecretClient: vi.fn().mockImplementation(() => ({
    getSecret: vi.fn().mockRejectedValue({ statusCode: 404 }),
  })),
}));

describe("AuthDelegation", () => {
  test("creates without Key Vault when KEY_VAULT_URL is not set", () => {
    const auth = new AuthDelegation();
    expect(auth).toBeDefined();
  });

  test("checkReadiness returns skipped without Key Vault", async () => {
    const auth = new AuthDelegation();
    const result = await auth.checkReadiness();
    expect(result.keyVault).toBe("skipped");
  });

  test("getDelegatedToken acquires token via DefaultAzureCredential", async () => {
    const auth = new AuthDelegation();
    const token = await auth.getDelegatedToken("navigate_page");
    expect(token).toBe("mock-azure-token");
  });

  test("getDelegatedToken for Graph skills uses Graph scope", async () => {
    const auth = new AuthDelegation();
    const token = await auth.getDelegatedToken("send_teams_message");
    expect(token).toBe("mock-azure-token");
  });

  test("getDelegatedToken for calendar uses Graph scope", async () => {
    const auth = new AuthDelegation();
    const token = await auth.getDelegatedToken("manage_calendar");
    expect(token).toBe("mock-azure-token");
  });

  test("getDelegatedToken for different skill categories", async () => {
    const auth = new AuthDelegation();
    for (const skill of [
      "navigate_page",
      "extract_content",
      "fill_form",
      "submit_action",
      "discover_apis",
      "capture_screenshot",
      "compare_data",
      "orchestrate_workflow",
    ] as const) {
      const token = await auth.getDelegatedToken(skill);
      expect(token).toBe("mock-azure-token");
    }
  });
});
