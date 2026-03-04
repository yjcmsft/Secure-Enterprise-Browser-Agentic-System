import { describe, expect, test, vi } from "vitest";
import { ElementSelector } from "../../../src/browser/element-selector.js";

describe("ElementSelector", () => {
  test("selects by css and waits first", async () => {
    const selector = new ElementSelector();
    const first = { id: "first" };
    const locatorFactory = vi.fn((): { first: () => { id: string } } => ({
      first: (): { id: string } => first,
    }));
    const page = {
      waitForSelector: vi.fn(async () => undefined),
      locator: locatorFactory,
    } as unknown as Parameters<ElementSelector["byCss"]>[0];

    const result = await selector.byCss(page, ".item", 1500);

    expect((page.waitForSelector as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(".item", {
      timeout: 1500,
    });
    expect(locatorFactory).toHaveBeenCalledWith(".item");
    expect(result).toBe(first);
  });

  test("scrolls located element into view", async () => {
    const selector = new ElementSelector();
    const locator = {
      scrollIntoViewIfNeeded: vi.fn(async () => undefined),
    } as unknown as Parameters<ElementSelector["scrollIntoView"]>[0];

    await selector.scrollIntoView(locator);

    expect((locator.scrollIntoViewIfNeeded as ReturnType<typeof vi.fn>)).toHaveBeenCalledOnce();
  });

  test("selects by xpath", () => {
    const selector = new ElementSelector();
    const first = { id: "xpath-result" };
    const page = {
      locator: vi.fn(() => ({ first: () => first })),
    } as unknown as Parameters<ElementSelector["byXPath"]>[0];

    const result = selector.byXPath(page, "//div[@class='item']");
    expect(page.locator).toHaveBeenCalledWith("xpath=//div[@class='item']");
    expect(result).toBe(first);
  });

  test("selects by text", () => {
    const selector = new ElementSelector();
    const first = { id: "text-result" };
    const page = {
      getByText: vi.fn(() => ({ first: () => first })),
    } as unknown as Parameters<ElementSelector["byText"]>[0];

    const result = selector.byText(page, "Click me");
    expect(page.getByText).toHaveBeenCalledWith("Click me");
    expect(result).toBe(first);
  });
});
