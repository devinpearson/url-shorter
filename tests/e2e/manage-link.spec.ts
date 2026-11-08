import { readFileSync } from "node:fs";
import { expect, logIn, test, uniqueName } from "./fixtures";

test("an officer prints a QR code, then points the link at a new Zoom meeting", async ({
  page,
  baseURL,
}) => {
  const name = uniqueName("zoom");
  const firstMeeting = `${baseURL}/about?meeting=1`;
  const nextMeeting = `${baseURL}/terms?meeting=2`;
  await logIn(page);

  // Create the link; the result shows its QR code straight away.
  await page.goto("/");
  await page.getByLabel("Paste your long link").fill(firstMeeting);
  await page.getByLabel(/Choose a short name/).fill(name);
  await page.getByRole("button", { name: "Shorten link" }).click();
  await expect(
    page.getByRole("img", { name: new RegExp(`QR code for .*/${name}$`) }),
  ).toBeVisible();

  // The poster download is a real PNG named after the link.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /download for poster/i }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(`${name}-qr.png`);
  const png = readFileSync(await download.path());
  expect(png.subarray(1, 4).toString()).toBe("PNG");

  // Scanning the QR code (it opens ?src=qr) counts as a QR scan.
  const scan = await page.request.get(`/${name}?src=qr`, { maxRedirects: 0 });
  expect(scan.headers().location).toBe(firstMeeting);

  await page.getByRole("link", { name: "Manage this link" }).click();
  await expect(page.getByText("from the QR code").locator("..")).toContainText("1");

  // New meeting: change where it goes. The printed link and QR code keep working.
  await page.getByLabel("New destination").fill(nextMeeting);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("now go here");
  await expect(page.getByText(firstMeeting)).toBeVisible(); // in "Earlier addresses"

  const afterEdit = await page.request.get(`/${name.toUpperCase()}?src=qr`, { maxRedirects: 0 });
  expect(afterEdit.headers().location).toBe(nextMeeting);

  // name+ shows where it goes without going there.
  const preview = await page.request.get(`/${name}+`);
  expect(preview.status()).toBe(200);
  expect(await preview.text()).toContain("goes to");
});
