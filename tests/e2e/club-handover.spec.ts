import { expect, logIn, test, uniqueName } from "./fixtures";

test("a club's links survive the officer who made them handing over", async ({
  page,
  browser,
  baseURL,
}) => {
  const clubSlug = uniqueName("club");
  const linkName = uniqueName("zoom");
  const destination = `${baseURL}/about?meeting=${linkName}`;
  await logIn(page, "Ada Outgoing");

  // Set up the club.
  await page.goto("/clubs");
  await page.getByLabel("Club name").fill("Sunrise Speakers");
  await page.getByLabel("Club page address").fill(clubSlug);
  await page.getByRole("button", { name: "Create club" }).click();
  await expect(page).toHaveURL(new RegExp(`/clubs/${clubSlug}$`));
  await expect(page.getByRole("heading", { name: "Sunrise Speakers", exact: true })).toBeVisible();

  // Make a link for the club, and list it on the club page.
  await page.goto(`/dashboard?club=${clubSlug}`);
  await expect(page.getByLabel("For")).toHaveValue(/.+/);
  await page.getByLabel("Paste your long link").fill(destination);
  await page.getByLabel("Short name (optional)").fill(linkName);
  await page.getByRole("button", { name: "Shorten" }).click();
  await page.getByRole("link", { name: `Manage ${linkName}: QR code, edit and stats` }).click();
  await page.getByLabel("Label (optional)").fill("Weekly meeting (Zoom)");
  await page.getByLabel(/Show on the club page/).check();
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // Invite the incoming officer.
  await page.goto(`/clubs/${clubSlug}`);
  await page.getByRole("button", { name: "Invite an officer" }).click();
  const inviteUrl = await page.getByLabel("Send this link to the new officer").inputValue();
  expect(inviteUrl).toMatch(/\/join\/[\w-]+$/);

  // They open it in their own browser, log in and join.
  const next = await browser.newContext();
  const grace = await next.newPage();
  await logIn(grace, "Grace Incoming");
  await grace.goto(inviteUrl);
  await expect(grace.getByRole("heading", { name: "Join Sunrise Speakers" })).toBeVisible();
  await grace.getByRole("button", { name: "Join as Grace Incoming" }).click();
  await expect(grace).toHaveURL(new RegExp(`/clubs/${clubSlug}$`));
  await expect(grace.getByText("Grace Incoming (you)")).toBeVisible();
  await expect(grace.getByText("Ada Outgoing", { exact: true })).toBeVisible();

  // The outgoing officer leaves.
  await page.reload();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Leave club" }).click();
  await expect(page).toHaveURL(/\/clubs$/);
  await expect(page.getByText("Sunrise Speakers")).toHaveCount(0);

  // The new officer has the link, and the public club page still lists it.
  await grace.goto("/dashboard");
  await expect(grace.getByText("Weekly meeting (Zoom)")).toBeVisible();
  await grace.goto(`/c/${clubSlug.toUpperCase()}`);
  await expect(grace.getByRole("heading", { name: "Sunrise Speakers", exact: true })).toBeVisible();
  await expect(grace.getByRole("link", { name: /Weekly meeting \(Zoom\)/ })).toHaveAttribute(
    "href",
    new RegExp(`/${linkName}$`),
  );
  const redirect = await grace.request.get(`/${linkName}`, { maxRedirects: 0 });
  expect(redirect.headers().location).toBe(destination);

  // A used invite can't let anyone else in.
  const late = await browser.newContext();
  const latePage = await late.newPage();
  await latePage.goto(inviteUrl);
  await expect(latePage.getByRole("alert")).toContainText("already been used");

  await next.close();
  await late.close();
});
