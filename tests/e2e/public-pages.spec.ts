import { expect, test } from "./fixtures";

test.describe("public pages", () => {
  test("landing page explains the site and asks logged-out visitors to log in", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Club Links/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Short links for your club meetings",
    );
    await expect(page.getByRole("button", { name: "Log in and shorten" })).toBeDisabled();
    await page.getByLabel("Link to shorten").fill("https://example.com");
    await expect(page.getByRole("button", { name: "Log in and shorten" })).toBeEnabled();
  });

  for (const { name, heading } of [
    { name: "About", heading: "About" },
    { name: "Contact", heading: "Contact" },
  ]) {
    test(`navbar opens ${name}`, async ({ page, isMobile }) => {
      await page.goto("/");
      if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`/${name.toLowerCase()}$`));
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    });
  }

  test("footer links to the terms and the link report form", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("navigation", { name: "Footer" });

    await footer.getByRole("link", { name: "Terms of Use" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Terms of Use" })).toBeVisible();
    await expect(page.getByText(/not affiliated with, endorsed by/)).toBeVisible();

    await footer.getByRole("link", { name: "Report a link" }).click();
    await expect(page.getByRole("radio", { name: "Report a link" })).toBeChecked();
  });

  test("the dashboard sends logged-out visitors to log in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=\/dashboard$/);
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("unknown app paths go home", async ({ page }) => {
    await page.goto("/stats");
    await expect(page).toHaveURL(/\/$/);
  });
});
