import { describe, expect, test, vi, beforeEach } from "vitest";

// Mock Azure SDK
vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn().mockImplementation(() => ({
    getToken: vi.fn().mockResolvedValue({ token: "header.eyJzdWIiOiJ1c2VyMSIsInNjcCI6IkNhbGVuZGFycy5SZWFkIENoYXQuUmVhZFdyaXRlIn0.sig" }),
  })),
}));

// Mock Microsoft Graph client
const mockGraphApi = {
  get: vi.fn().mockResolvedValue({ value: [] }),
  post: vi.fn().mockResolvedValue({ id: "new-1" }),
};

vi.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    init: vi.fn().mockReturnValue({
      api: vi.fn().mockReturnValue(mockGraphApi),
    }),
  },
}));

import { withGraphClient } from "../../../src/graph/client.js";
import type { SkillExecutionContext } from "../../../src/types/skills.js";

const ctx: SkillExecutionContext = {
  userId: "user1",
  sessionId: "s1",
  graphAccessToken: "header.eyJzdWIiOiJ1c2VyMSIsInNjcCI6IkNhbGVuZGFycy5SZWFkIENoYXQuUmVhZFdyaXRlIn0.sig",
};

describe("withGraphClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("executes operation with Graph client", async () => {
    const result = await withGraphClient(ctx, async (client) => {
      return client.api("/me").get();
    });
    expect(result).toEqual({ value: [] });
  });

  test("uses provided graphAccessToken", async () => {
    const result = await withGraphClient(ctx, async (client) => {
      return client.api("/me/events").get();
    });
    expect(result).toBeDefined();
  });

  test("passes required permissions", async () => {
    const result = await withGraphClient(
      ctx,
      async (client) => client.api("/me").get(),
      { requiredPermissions: ["Calendars.Read"] },
    );
    expect(result).toBeDefined();
  });

  test("throws on missing permissions", async () => {
    await expect(
      withGraphClient(
        ctx,
        async (client) => client.api("/me").get(),
        { requiredPermissions: ["Mail.Send.All"] },
      ),
    ).rejects.toThrow("Missing required Microsoft Graph permissions");
  });

  test("retries on failure", async () => {
    let calls = 0;
    mockGraphApi.get.mockImplementation(async () => {
      calls++;
      if (calls < 2) throw new Error("Network error");
      return { success: true };
    });

    const result = await withGraphClient(ctx, async (client) => {
      return client.api("/me").get();
    });
    expect(result).toEqual({ success: true });
  });
});
