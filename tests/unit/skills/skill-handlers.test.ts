import { describe, expect, test, vi, beforeEach } from "vitest";
import type { SkillExecutionContext } from "../../../src/types/skills.js";

// Mock the runtime module so skill tests don't need real browser/Azure services
const mockSecurityGate = {
  executeWithSecurity: vi.fn(
    async (
      _skill: string,
      _params: Record<string, unknown>,
      _context: SkillExecutionContext,
      handler: (token: string) => Promise<{ data: unknown; path: string }>,
    ) => {
      return handler("mock-token");
    },
  ),
};

const mockDualPathRouter = {
  decide: vi.fn().mockResolvedValue({ path: "dom", reason: "No API" }),
  getDiscovery: vi.fn().mockReturnValue({
    discover: vi.fn().mockResolvedValue(null),
  }),
};

const mockRestConnector = {
  request: vi.fn().mockResolvedValue({ data: "api-response" }),
};

const mockPage = {
  goto: vi.fn().mockResolvedValue(undefined),
  title: vi.fn().mockResolvedValue("Test Page"),
  url: vi.fn().mockReturnValue("https://example.com"),
  content: vi.fn().mockResolvedValue("<html><body>Hello</body></html>"),
  click: vi.fn().mockResolvedValue(undefined),
  screenshot: vi.fn().mockResolvedValue(Buffer.from("fake-png")),
  waitForSelector: vi.fn().mockResolvedValue(undefined),
  getByText: vi.fn().mockReturnValue({ first: () => ({ click: vi.fn().mockResolvedValue(undefined) }) }),
  locator: vi.fn().mockReturnValue({
    first: () => ({
      screenshot: vi.fn().mockResolvedValue(Buffer.from("element-png")),
      getAttribute: vi.fn().mockResolvedValue("text"),
      fill: vi.fn().mockResolvedValue(undefined),
      check: vi.fn().mockResolvedValue(undefined),
      uncheck: vi.fn().mockResolvedValue(undefined),
    }),
  }),
  evaluate: vi.fn().mockResolvedValue([{ name: "field1", value: "value1" }]),
};

const mockSessionManager = {
  getOrCreateSession: vi.fn().mockResolvedValue({
    userId: "user1",
    sessionId: "s1",
    context: { setExtraHTTPHeaders: vi.fn() },
    page: mockPage,
  }),
  getPage: vi.fn().mockReturnValue(mockPage),
  injectAuth: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../../../src/runtime.js", () => ({
  runtime: {
    securityGate: mockSecurityGate,
    dualPathRouter: mockDualPathRouter,
    restConnector: mockRestConnector,
    domParser: {
      extractAll: vi.fn().mockReturnValue({
        textBlocks: ["Hello World"],
        links: [{ text: "Link", href: "https://example.com" }],
        tables: [{ headers: ["Col1"], rows: [["Val1"]] }],
      }),
    },
  },
  sessionManager: mockSessionManager,
}));

const ctx: SkillExecutionContext = { userId: "user1", sessionId: "s1" };

describe("navigatePage", () => {
  let navigatePage: typeof import("../../../src/skills/navigate-page.js").navigatePage;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../src/skills/navigate-page.js");
    navigatePage = mod.navigatePage;
  });

  test("navigates via DOM path", async () => {
    const result = await navigatePage({ url: "https://example.com" }, ctx);
    expect(result.skill).toBe("navigate_page");
    expect(result.success).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("navigates via API path when available", async () => {
    mockDualPathRouter.decide.mockResolvedValueOnce({ path: "api", reason: "Found API" });
    const result = await navigatePage({ url: "https://example.com" }, ctx);
    expect(result.success).toBe(true);
    expect(mockRestConnector.request).toHaveBeenCalledWith("GET", "https://example.com", "mock-token");
  });

  test("waits for selector when provided", async () => {
    const result = await navigatePage(
      { url: "https://example.com", waitFor: "#content" },
      ctx,
    );
    expect(result.success).toBe(true);
  });

  test("clicks text when clickText provided", async () => {
    const result = await navigatePage(
      { url: "https://example.com", clickText: "Continue" },
      ctx,
    );
    expect(result.success).toBe(true);
  });
});

describe("extractContent", () => {
  let extractContent: typeof import("../../../src/skills/extract-content.js").extractContent;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../src/skills/extract-content.js");
    extractContent = mod.extractContent;
  });

  test("extracts all content by default", async () => {
    const result = await extractContent({}, ctx);
    expect(result.skill).toBe("extract_content");
    expect(result.success).toBe(true);
  });

  test("extracts tables only", async () => {
    const result = await extractContent({ mode: "table" }, ctx);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("tables");
  });

  test("extracts text only", async () => {
    const result = await extractContent({ mode: "text" }, ctx);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("textBlocks");
  });

  test("extracts links only", async () => {
    const result = await extractContent({ mode: "links" }, ctx);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("links");
  });

  test("extracts form values", async () => {
    const result = await extractContent({ mode: "form_values" }, ctx);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("formValues");
  });

  test("uses API path when URL has API schema", async () => {
    mockDualPathRouter.decide.mockResolvedValueOnce({ path: "api", reason: "Found API" });
    const result = await extractContent({ url: "https://api.example.com/data", mode: "all" }, ctx);
    expect(result.success).toBe(true);
  });

  test("throws when no page and no URL", async () => {
    mockSessionManager.getPage.mockReturnValueOnce(undefined);
    await expect(extractContent({}, ctx)).rejects.toThrow("No active browser session");
  });
});

describe("fillForm", () => {
  let fillForm: typeof import("../../../src/skills/fill-form.js").fillForm;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../src/skills/fill-form.js");
    fillForm = mod.fillForm;
  });

  test("fills form fields via DOM", async () => {
    const result = await fillForm({ fields: { name: "John" } }, ctx);
    expect(result.skill).toBe("fill_form");
    expect(result.success).toBe(true);
  });

  test("throws when fields is empty", async () => {
    await expect(fillForm({ fields: {} }, ctx)).rejects.toThrow("at least one entry");
  });

  test("throws when fields is null", async () => {
    await expect(fillForm({ fields: null }, ctx)).rejects.toThrow("at least one entry");
  });

  test("uses API path when available", async () => {
    mockDualPathRouter.decide.mockResolvedValueOnce({ path: "api", reason: "Found API" });
    const result = await fillForm(
      { url: "https://api.example.com/form", fields: { name: "John" } },
      ctx,
    );
    expect(result.success).toBe(true);
  });

  test("throws when no page", async () => {
    mockSessionManager.getPage.mockReturnValueOnce(undefined);
    await expect(fillForm({ fields: { x: "y" } }, ctx)).rejects.toThrow("No active browser session");
  });
});

describe("submitAction", () => {
  let submitAction: typeof import("../../../src/skills/submit-action.js").submitAction;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../src/skills/submit-action.js");
    submitAction = mod.submitAction;
  });

  test("submits via DOM click", async () => {
    const result = await submitAction({}, ctx);
    expect(result.skill).toBe("submit_action");
    expect(result.success).toBe(true);
  });

  test("submits via API path", async () => {
    mockDualPathRouter.decide.mockResolvedValueOnce({ path: "api", reason: "Found API" });
    const result = await submitAction({ url: "https://api.example.com/submit" }, ctx);
    expect(result.success).toBe(true);
  });

  test("throws when no page", async () => {
    mockSessionManager.getPage.mockReturnValueOnce(undefined);
    await expect(submitAction({}, ctx)).rejects.toThrow("No active browser session");
  });
});

describe("captureScreenshot", () => {
  let captureScreenshot: typeof import("../../../src/skills/capture-screenshot.js").captureScreenshot;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../src/skills/capture-screenshot.js");
    captureScreenshot = mod.captureScreenshot;
  });

  test("captures full page screenshot", async () => {
    const result = await captureScreenshot({}, ctx);
    expect(result.skill).toBe("capture_screenshot");
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("imageBase64");
  });

  test("captures element screenshot with selector", async () => {
    const result = await captureScreenshot({ selector: "#chart" }, ctx);
    expect(result.success).toBe(true);
  });

  test("throws when no page", async () => {
    mockSessionManager.getPage.mockReturnValueOnce(undefined);
    await expect(captureScreenshot({}, ctx)).rejects.toThrow("No active browser session");
  });
});

describe("discoverApis", () => {
  let discoverApis: typeof import("../../../src/skills/discover-apis.js").discoverApis;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../../src/skills/discover-apis.js");
    discoverApis = mod.discoverApis;
  });

  test("discovers APIs for a base URL", async () => {
    const result = await discoverApis({ baseUrl: "https://example.com" }, ctx);
    expect(result.skill).toBe("discover_apis");
    expect(result.success).toBe(true);
  });

  test("returns empty endpoints when no schema found", async () => {
    const result = await discoverApis({ baseUrl: "https://no-api.example.com" }, ctx);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("endpoints");
  });
});
