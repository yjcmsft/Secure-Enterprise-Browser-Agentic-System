import { describe, expect, test, vi, beforeEach } from "vitest";

// Mock Azure Identity for AuthDelegation
const mockGetToken = vi.fn().mockResolvedValue({ token: "azure-delegated-token" });
const mockGetSecret = vi.fn();

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn().mockImplementation(() => ({
    getToken: mockGetToken,
  })),
}));

vi.mock("@azure/keyvault-secrets", () => ({
  SecretClient: vi.fn().mockImplementation(() => ({
    getSecret: mockGetSecret,
  })),
}));

// Mock config with Key Vault URL
vi.mock("../../src/config.js", () => ({
  config: {
    KEY_VAULT_URL: "https://test-vault.vault.azure.net",
    TARGET_APP_SCOPE: "https://target-app/.default",
    GRAPH_DEFAULT_SCOPE: "https://graph.microsoft.com/.default",
    allowlistPatterns: ["*"],
    MAX_BROWSER_CONCURRENCY: 3,
    SESSION_TTL_MS: 600000,
    CONTENT_SAFETY_ENDPOINT: "",
    CONTENT_SAFETY_BLOCK_THRESHOLD: 4,
    COSMOS_ENDPOINT: "",
    COSMOS_KEY: "",
    COSMOS_DATABASE: "browser-agent",
    COSMOS_AUDIT_CONTAINER: "audit",
  },
}));

import { AuthDelegation } from "../../src/security/auth-delegation.js";

describe("AuthDelegation with Key Vault", () => {
  let auth: AuthDelegation;

  beforeEach(() => {
    vi.clearAllMocks();
    auth = new AuthDelegation();
  });

  test("getDelegatedToken retrieves token from Key Vault first", async () => {
    mockGetSecret.mockResolvedValueOnce({ value: "kv-token-for-read" });

    const token = await auth.getDelegatedToken("navigate_page");
    expect(token).toBe("kv-token-for-read");
    expect(mockGetSecret).toHaveBeenCalledWith("token-application.read");
  });

  test("falls back to DefaultAzureCredential when KV has no value", async () => {
    mockGetSecret.mockResolvedValueOnce({ value: undefined });

    const token = await auth.getDelegatedToken("extract_content");
    expect(token).toBe("azure-delegated-token");
    expect(mockGetToken).toHaveBeenCalledWith("https://target-app/.default");
  });

  test("falls back to DefaultAzureCredential when KV throws", async () => {
    mockGetSecret.mockRejectedValueOnce(new Error("Secret not found"));

    const token = await auth.getDelegatedToken("fill_form");
    expect(token).toBe("azure-delegated-token");
  });

  test("uses Graph scope for Teams skills", async () => {
    mockGetSecret.mockRejectedValueOnce(new Error("Not found"));

    const token = await auth.getDelegatedToken("send_teams_message");
    expect(token).toBe("azure-delegated-token");
    expect(mockGetToken).toHaveBeenCalledWith("https://graph.microsoft.com/.default");
  });

  test("uses Graph scope for Calendar skills", async () => {
    mockGetSecret.mockRejectedValueOnce(new Error("Not found"));

    const token = await auth.getDelegatedToken("manage_calendar");
    expect(token).toBe("azure-delegated-token");
    expect(mockGetToken).toHaveBeenCalledWith("https://graph.microsoft.com/.default");
  });

  test("uses target app scope for submit_action", async () => {
    mockGetSecret.mockRejectedValueOnce(new Error("Not found"));

    const token = await auth.getDelegatedToken("submit_action");
    expect(token).toBe("azure-delegated-token");
    expect(mockGetToken).toHaveBeenCalledWith("https://target-app/.default");
  });

  test("uses target app scope for discover_apis", async () => {
    mockGetSecret.mockRejectedValueOnce(new Error("Not found"));

    await auth.getDelegatedToken("discover_apis");
    expect(mockGetToken).toHaveBeenCalledWith("https://target-app/.default");
  });

  test("uses target app scope for capture_screenshot", async () => {
    mockGetSecret.mockRejectedValueOnce(new Error("Not found"));

    await auth.getDelegatedToken("capture_screenshot");
    expect(mockGetToken).toHaveBeenCalledWith("https://target-app/.default");
  });

  test("uses target app scope for compare_data", async () => {
    mockGetSecret.mockRejectedValueOnce(new Error("Not found"));

    await auth.getDelegatedToken("compare_data");
    expect(mockGetToken).toHaveBeenCalledWith("https://target-app/.default");
  });

  test("uses target app scope for orchestrate_workflow", async () => {
    mockGetSecret.mockRejectedValueOnce(new Error("Not found"));

    await auth.getDelegatedToken("orchestrate_workflow");
    expect(mockGetToken).toHaveBeenCalledWith("https://target-app/.default");
  });

  test("uses target app scope for analyze_work_patterns", async () => {
    mockGetSecret.mockRejectedValueOnce(new Error("Not found"));

    await auth.getDelegatedToken("analyze_work_patterns");
    expect(mockGetToken).toHaveBeenCalledWith("https://target-app/.default");
  });

  test("uses target app scope for create_adaptive_card", async () => {
    mockGetSecret.mockRejectedValueOnce(new Error("Not found"));

    await auth.getDelegatedToken("create_adaptive_card");
    expect(mockGetToken).toHaveBeenCalledWith("https://target-app/.default");
  });

  test("throws when both KV and credential return nothing", async () => {
    mockGetSecret.mockRejectedValueOnce(new Error("Not found"));
    mockGetToken.mockResolvedValueOnce(null);

    await expect(auth.getDelegatedToken("navigate_page")).rejects.toThrow(
      "Unable to obtain delegated token",
    );
  });

  test("throws when credential returns empty token", async () => {
    mockGetSecret.mockRejectedValueOnce(new Error("Not found"));
    mockGetToken.mockResolvedValueOnce({ token: "" });

    await expect(auth.getDelegatedToken("fill_form")).rejects.toThrow(
      "Unable to obtain delegated token",
    );
  });
});

describe("AuthDelegation readiness", () => {
  test("checkReadiness returns ready when KV responds", async () => {
    mockGetSecret.mockRejectedValueOnce({ statusCode: 404 });

    const auth = new AuthDelegation();
    const result = await auth.checkReadiness();
    expect(result.keyVault).toBe("ready");
  });

  test("checkReadiness returns ready when secret exists", async () => {
    mockGetSecret.mockResolvedValueOnce({ value: "probe" });

    const auth = new AuthDelegation();
    const result = await auth.checkReadiness();
    expect(result.keyVault).toBe("ready");
  });

  test("checkReadiness throws on unexpected KV error", async () => {
    mockGetSecret.mockRejectedValueOnce({ statusCode: 500, message: "Server Error" });

    const auth = new AuthDelegation();
    await expect(auth.checkReadiness()).rejects.toThrow("Key Vault readiness check failed");
  });
});
