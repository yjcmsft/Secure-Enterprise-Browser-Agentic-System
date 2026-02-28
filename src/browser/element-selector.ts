import type { Locator, Page } from "playwright";

export class ElementSelector {
  public async byCss(page: Page, selector: string, timeout = 10000): Promise<Locator> {
    await page.waitForSelector(selector, { timeout });
    return page.locator(selector).first();
  }

  public byXPath(page: Page, selector: string): Locator {
    return page.locator(`xpath=${selector}`).first();
  }

  public byText(page: Page, text: string): Locator {
    return page.getByText(text).first();
  }

  public async scrollIntoView(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }
}
