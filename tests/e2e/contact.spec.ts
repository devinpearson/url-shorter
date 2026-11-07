import { expect, test } from "./fixtures";

test("a visitor reports a link through the contact form", async ({ page }) => {
  await page.goto("/contact?topic=report");
  await page.getByLabel("Name").fill("Concerned Member");
  await page.getByLabel("Email").fill("member@example.com");
  await page.getByLabel("Short link you're reporting").fill("toast.li/suspicious");
  await page.getByLabel("Message").fill("This link goes to a phishing page.");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByRole("status")).toContainText("Thank you, your message has been sent.");
  await expect(page.getByRole("status")).toContainText("member@example.com");
});
