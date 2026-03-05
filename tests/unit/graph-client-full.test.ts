import { describe, expect, test, vi, beforeEach } from "vitest";

// Hoist mock variables so they're accessible inside vi.mock() factories
const { mockGetToken, mockApi } = vi.hoisted(() => ({
  mockGetToken: vi.fn().mockResolvedValue({ token: "mock-graph-token" }),
  mockApi: {
    get: vi.fn().mockResolvedValue({ value: [] }),
    post: vi.fn().mockResolvedValue({ id: "msg-1" }),
    patch: vi.fn().mockResolvedValue({ id: "evt-1" }),
    top: vi.fn().mockReturnThis(),
  },
}));

// Mock Azure Identity
vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn(function DefaultAzureCredential() {
    return { getToken: mockGetToken };
  }),
}));

// Mock Graph client
vi.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    init: vi.fn().mockReturnValue({ api: vi.fn().mockReturnValue(mockApi) }),
  },
}));

vi.mock("../../src/config.js", () => ({
  config: {
    GRAPH_DEFAULT_SCOPE: "https://graph.microsoft.com/.default",
    TARGET_APP_SCOPE: "https://target-app/.default",
    allowlistPatterns: ["*"],
    MAX_BROWSER_CONCURRENCY: 3,
    SESSION_TTL_MS: 600000,
    KEY_VAULT_URL: "",
    CONTENT_SAFETY_ENDPOINT: "",
    CONTENT_SAFETY_BLOCK_THRESHOLD: 4,
  },
}));

import { withGraphClient } from "../../src/graph/client.js";

describe("withGraphClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("executes operation with graph client", async () => {
    const result = await withGraphClient(
      { userId: "u1", sessionId: "s1" },
      async (client) => {
        return client.api("/me").get();
      },
    );
    expect(result).toEqual({ value: [] });
  });

  test("uses provided graphAccessToken from context", async () => {
    // Create a valid JWT with permissions
    const payload = Buffer.from(JSON.stringify({ scp: "Chat.ReadWrite" })).toString("base64");
    const fakeJwt = `header.${payload}.signature`;

    const result = await withGraphClient(
      { userId: "u1", sessionId: "s1", graphAccessToken: fakeJwt },
      async (client) => client.api("/me/chats").get(),
      { requiredPermissions: ["Chat.ReadWrite"] },
    );
    expect(result).toBeDefined();
    // Should NOT call DefaultAzureCredential.getToken
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  test("retries on failure up to 3 times", async () => {
    let attempt = 0;
    const result = await withGraphClient(
      { userId: "u1", sessionId: "s1" },
      async () => {
        attempt++;
        if (attempt < 3) throw new Error("Transient failure");
        return { success: true };
      },
    );
    expect(result).toEqual({ success: true });
    expect(attempt).toBe(3);
  });

  test("throws after 3 failed attempts", async () => {
    await expect(
      withGraphClient(
        { userId: "u1", sessionId: "s1" },
        async () => { throw new Error("Persistent failure"); },
      ),
    ).rejects.toThrow("Persistent failure");
  });

  test("validates required permissions from JWT scp claim", async () => {
    const payload = Buffer.from(JSON.stringify({ scp: "Mail.Read" })).toString("base64");
    const jwt = `h.${payload}.s`;

    await expect(
      withGraphClient(
        { userId: "u1", sessionId: "s1", graphAccessToken: jwt },
        async (client) => client.api("/me").get(),
        { requiredPermissions: ["Chat.ReadWrite"] },
      ),
    ).rejects.toThrow("Missing required Microsoft Graph permissions");
  });

  test("validates permissions from roles claim", async () => {
    const payload = Buffer.from(
      JSON.stringify({ roles: ["Application.Read.All"] }),
    ).toString("base64");
    const jwt = `h.${payload}.s`;

    const result = await withGraphClient(
      { userId: "u1", sessionId: "s1", graphAccessToken: jwt },
      async (client) => client.api("/me").get(),
      { requiredPermissions: ["Application.Read.All"] },
    );
    expect(result).toBeDefined();
  });

  test("handles invalid JWT gracefully", async () => {
    await expect(
      withGraphClient(
        { userId: "u1", sessionId: "s1", graphAccessToken: "not-a-jwt" },
        async (client) => client.api("/me").get(),
        { requiredPermissions: ["Mail.Read"] },
      ),
    ).rejects.toThrow("Unable to decode Graph access token claims");
  });

  test("skips permission check when no permissions required", async () => {
    const result = await withGraphClient(
      { userId: "u1", sessionId: "s1" },
      async (client) => client.api("/me").get(),
    );
    expect(result).toBeDefined();
  });

  test("resolves token via DefaultAzureCredential when no graphAccessToken", async () => {
    await withGraphClient(
      { userId: "u1", sessionId: "s1" },
      async (client) => client.api("/me").get(),
    );
    expect(mockGetToken).toHaveBeenCalledWith("https://graph.microsoft.com/.default");
  });

  test("throws when credential returns no token", async () => {
    mockGetToken.mockResolvedValueOnce(null);
    await expect(
      withGraphClient(
        { userId: "u1", sessionId: "s1" },
        async (client) => client.api("/me").get(),
      ),
    ).rejects.toThrow("Unable to acquire Microsoft Graph token");
  });

  test("handles empty scp and roles in JWT", async () => {
    const payload = Buffer.from(JSON.stringify({})).toString("base64");
    const jwt = `h.${payload}.s`;

    // No required permissions — should pass
    const result = await withGraphClient(
      { userId: "u1", sessionId: "s1", graphAccessToken: jwt },
      async (client) => client.api("/me").get(),
    );
    expect(result).toBeDefined();
  });
});
