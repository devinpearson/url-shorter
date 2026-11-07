import { test as base, expect, type Page } from "@playwright/test";

/** A name no other test in this run will use, since all tests share one database. */
export function uniqueName(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Logs the browser context in as a fresh test user through the test-only login route. */
export async function logIn(page: Page, displayName = "Test Officer") {
  const res = await page.request.post("/api/test/login", {
    data: { id: uniqueName("test|user"), displayName, email: `${uniqueName("u")}@example.com` },
  });
  expect(res.ok()).toBeTruthy();
}

/**
 * Stands in for Auth0: when the app sends the browser to /api/auth/login, log in through
 * the test route and come back to `/`, as the real callback does.
 */
export async function fakeAuth0(page: Page) {
  await page.route("**/api/auth/login", async (route) => {
    await logIn(page);
    await route.fulfill({ status: 302, headers: { location: "/" } });
  });
}

/**
 * Fails the test if the page logs an error or throws, like the stale-asset 500s and 401 noise.
 * A test that triggers errors on purpose matches them with test.use({ expectedErrors: /…/ }).
 */
export const test = base.extend<{ consoleErrors: string[]; expectedErrors: RegExp | null }>({
  expectedErrors: [null, { option: true }],
  consoleErrors: [
    async ({ page, expectedErrors }, use) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));
      await use(errors);
      const unexpected = errors.filter((e) => !expectedErrors?.test(e));
      expect(unexpected, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
