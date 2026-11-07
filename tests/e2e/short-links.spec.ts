import { API_URL, expect, fakeAuth0, logIn, test, uniqueName } from "./fixtures";

test.describe("short links", () => {
  test("a logged-out officer fills in the form, logs in and gets their link", async ({
    page,
    request,
  }) => {
    const name = uniqueName("roles");
    await fakeAuth0(page);

    await page.goto("/");
    await page.getByLabel("Link to shorten").fill("https://example.com/role-signup");
    await page.getByLabel(/Custom name/).fill(name);
    await page.getByRole("button", { name: "Log in and shorten" }).click();

    // Back from "Auth0": the link is created without retyping anything.
    await expect(page.getByText("Your short link is ready")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(`/${name}$`) })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toContainText("Log out");

    // The short link redirects (served by the backend, as nginx does on toast.li).
    const redirect = await request.get(`${API_URL}/${name}`, { maxRedirects: 0 });
    expect(redirect.status()).toBe(302);
    expect(redirect.headers().location).toBe("https://example.com/role-signup");

    // …and the click shows on the dashboard and the stats page.
    await page.getByRole("link", { name: "All your links" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const row = page.getByRole("link", { name: new RegExp(`/${name}$`) }).locator("../..");
    await expect(row).toContainText("1 clicks");
    await row.getByRole("link", { name: "1 clicks" }).click();
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

      const url = page.getByLabel("Link to shorten");
      const custom = page.getByLabel(/Custom name/);
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
      await expect(page.getByRole("alert")).toHaveText(/reserved/);
    });
  });

  test("an officer can delete a link from the dashboard", async ({ page }) => {
    const name = uniqueName("old");
    await logIn(page);
    await page.goto("/dashboard");
    await page.getByLabel("Paste a long URL").fill("https://example.com/old");
    await page.getByLabel("Custom name").fill(name);
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
