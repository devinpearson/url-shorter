import { expect, fakeAuth0, logIn, test, uniqueName } from "./fixtures";

test.describe("short links", () => {
  test("a logged-out officer fills in the form, logs in and gets their link", async ({
    page,
    baseURL,
  }) => {
    const name = uniqueName("roles");
    // A destination served by the test app itself, so the test doesn't need the internet.
    // (Playwright can't stub a page reached through a redirect.)
    const destinationUrl = `${baseURL}/terms?from=${name}`;
    await fakeAuth0(page);

    await page.goto("/");
    await page.getByLabel("Paste your long link").fill(destinationUrl);
    await page.getByLabel(/Choose a short name/).fill(name);
    await page.getByRole("button", { name: "Log in and shorten" }).click();

    // Back from "Auth0": the link is created without retyping anything.
    await expect(page.getByText("Your short link is ready")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(`/${name}$`) })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toContainText("Log out");

    // Clicking the short link (it opens in a new tab) lands on the destination, not the app's
    // home page: the web server must hand short links to the backend, as nginx does on toast.li.
    const [destination] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("link", { name: new RegExp(`/${name}$`) }).click(),
    ]);
    await expect(destination).toHaveURL(destinationUrl);
    await expect(destination.getByRole("heading", { level: 1 })).toHaveText("Terms of Use");
    await destination.close();

    // Typed from a poster in capitals, it's still the same link.
    const shouted = await page.request.get(`/${name.toUpperCase()}`, { maxRedirects: 0 });
    expect(shouted.status()).toBe(302);
    expect(shouted.headers().location).toBe(destinationUrl);

    // …and the click shows on the dashboard and the stats page.
    await page.getByRole("link", { name: "All your links" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const row = page.getByRole("link", { name: new RegExp(`/${name}$`) }).locator("../..");
    await expect(row).toContainText("2 clicks");
    await row.getByRole("link", { name: "2 clicks" }).click();
    await expect(page).toHaveURL(new RegExp(`/stats/${name}$`));
    await expect(page.getByText("total clicks")).toBeVisible();
  });

  test.describe("rejected names", () => {
    // The browser logs the API's 409 and 400 answers; they're the point of this test.
    test.use({ expectedErrors: /status of (409|400)/ });

    test("an officer can't take a name that's in use or reserved", async ({ page }) => {
      const name = uniqueName("taken");
      await logIn(page);
      await page.goto("/");

      const url = page.getByLabel("Paste your long link");
      const custom = page.getByLabel(/Choose a short name/);
      const shorten = page.getByRole("button", { name: "Shorten link" });

      await url.fill("https://example.com/a");
      await custom.fill(name);
      await shorten.click();
      await expect(page.getByText("Your short link is ready")).toBeVisible();

      await url.fill("https://example.com/b");
      await custom.fill(name);
      await shorten.click();
      await expect(page.getByRole("alert")).toHaveText(/already taken/);

      await custom.fill("about");
      await shorten.click();
      await expect(page.getByRole("alert")).toHaveText(/used by the site itself/);
    });
  });

  test("an officer can delete a link from the dashboard", async ({ page }) => {
    const name = uniqueName("old");
    await logIn(page);
    await page.goto("/dashboard");
    await page.getByLabel("Paste your long link").fill("https://example.com/old");
    await page.getByLabel("Short name (optional)").fill(name);
    await page.getByRole("button", { name: "Shorten" }).click();

    const link = page.getByRole("link", { name: new RegExp(`/${name}$`) });
    await expect(link).toBeVisible();
    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await expect(link).toHaveCount(0);
  });

  test("logging out returns to the landing page", async ({ page, isMobile }) => {
    await logIn(page);
    await page.goto("/about");
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("link", { name: "Log out" }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:5100\/$/);
    await expect(page.getByRole("button", { name: "Log in and shorten" })).toBeVisible();
  });
});
