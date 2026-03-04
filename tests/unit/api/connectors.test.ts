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

  test("GraphqlConnector throws on GraphQL errors", async () => {
    const connector = new GraphqlConnector();
    const postMock = vi.mocked(axios.post);

    postMock.mockResolvedValueOnce({
      data: { data: null, errors: [{ message: "Not found" }, { message: "Invalid" }] },
    });

    await expect(
      connector.query("https://example.com/graphql", "query { id }", {}, "token"),
    ).rejects.toThrow("Not found; Invalid");
  });

  test("RestConnector retries on timeout errors", async () => {
    const connector = new RestConnector();
    const requestMock = vi.mocked(axios.request);

    requestMock
      .mockRejectedValueOnce({ isAxiosError: true, code: "ETIMEDOUT" })
      .mockResolvedValueOnce({ data: { ok: true } });

    const result = await connector.request("GET", "https://example.com", "token");
    expect(result).toEqual({ ok: true });
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  test("RestConnector retries on connection aborted", async () => {
    const connector = new RestConnector();
    const requestMock = vi.mocked(axios.request);

    requestMock
      .mockRejectedValueOnce({ isAxiosError: true, code: "ECONNABORTED" })
      .mockResolvedValueOnce({ data: { recovered: true } });

    const result = await connector.request("GET", "https://example.com", "token");
    expect(result).toEqual({ recovered: true });
  });

  test("RestConnector retries on no response (network error)", async () => {
    const connector = new RestConnector();
    const requestMock = vi.mocked(axios.request);

    requestMock
      .mockRejectedValueOnce({ isAxiosError: true })
      .mockResolvedValueOnce({ data: { ok: true } });

    const result = await connector.request("GET", "https://example.com", "token");
    expect(result).toEqual({ ok: true });
  });

  test("RestConnector sends correct headers", async () => {
    const connector = new RestConnector();
    const requestMock = vi.mocked(axios.request);
    requestMock.mockResolvedValueOnce({ data: { ok: true } });

    await connector.request("POST", "https://example.com/api", "my-token", { key: "value" });

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "https://example.com/api",
        data: { key: "value" },
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
        }),
      }),
    );
  });

  test("GraphqlConnector retries on connection abort", async () => {
    const connector = new GraphqlConnector();
    const postMock = vi.mocked(axios.post);

    postMock
      .mockRejectedValueOnce({ isAxiosError: true, code: "ECONNABORTED" })
      .mockResolvedValueOnce({ data: { data: { ok: true } } });

    const result = await connector.query("https://example.com/graphql", "query { ok }", {}, "token");
    expect(result).toEqual({ ok: true });
  });

  test("RestConnector non-axios error is not retried", async () => {
    const connector = new RestConnector();
    const requestMock = vi.mocked(axios.request);

    requestMock.mockRejectedValueOnce(new Error("Unknown error"));

    await expect(connector.request("GET", "https://example.com", "token")).rejects.toThrow("Unknown error");
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});