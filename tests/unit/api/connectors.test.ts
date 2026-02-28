import axios from "axios";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { GraphqlConnector } from "../../../src/api/graphql-connector.js";
import { RestConnector } from "../../../src/api/rest-connector.js";

vi.mock("axios", () => ({
  default: {
    request: vi.fn(),
    post: vi.fn(),
    isAxiosError: (value: unknown): boolean =>
      typeof value === "object" && value !== null && (value as { isAxiosError?: boolean }).isAxiosError === true,
  },
}));

describe("API connectors retries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("RestConnector retries transient failure then succeeds", async () => {
    const connector = new RestConnector();
    const requestMock = vi.mocked(axios.request);

    requestMock
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 503 } })
      .mockResolvedValueOnce({ data: { ok: true } });

    const result = await connector.request("GET", "https://example.com", "token");

    expect(result).toEqual({ ok: true });
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  test("RestConnector does not retry non-transient client error", async () => {
    const connector = new RestConnector();
    const requestMock = vi.mocked(axios.request);

    requestMock.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400 } });

    await expect(connector.request("GET", "https://example.com", "token")).rejects.toBeDefined();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  test("GraphqlConnector retries transient failure then succeeds", async () => {
    const connector = new GraphqlConnector();
    const postMock = vi.mocked(axios.post);

    postMock
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 429 } })
      .mockResolvedValueOnce({ data: { data: { id: "1" } } });

    const result = await connector.query("https://example.com/graphql", "query { id }", {}, "token");

    expect(result).toEqual({ id: "1" });
    expect(postMock).toHaveBeenCalledTimes(2);
  });
});