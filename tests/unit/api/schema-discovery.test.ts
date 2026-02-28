import axios from "axios";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SchemaDiscovery } from "../../../src/api/schema-discovery.js";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("SchemaDiscovery cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("caches positive discovery result", async () => {
    const getMock = vi.mocked(axios.get);
    getMock.mockResolvedValue({ data: { paths: { "/health": { get: { description: "health" } } } } });

    const discovery = new SchemaDiscovery();
    const first = await discovery.discover("https://example.com/");
    const second = await discovery.discover("https://example.com");

    expect(first?.endpoints.length).toBe(1);
    expect(second?.endpoints.length).toBe(1);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  test("caches negative discovery result", async () => {
    const getMock = vi.mocked(axios.get);
    getMock.mockRejectedValue(new Error("not found"));

    const discovery = new SchemaDiscovery();
    const first = await discovery.discover("https://no-api.example.com");
    const second = await discovery.discover("https://no-api.example.com/");

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(getMock).toHaveBeenCalledTimes(5);
  });
});