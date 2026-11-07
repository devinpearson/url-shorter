import { describe, expect, it } from "vitest";
import { setupApi } from "./helpers";

const { api, db, loggedIn } = setupApi();

async function officerWithLink(name = "sunrise-zoom", originalUrl = "https://zoom.us/j/111") {
  const agent = await loggedIn({ id: `test|${name}` });
  await agent.post("/api/urls").send({ originalUrl, customShortId: name }).expect(201);
  return agent;
}

describe("changing where a link goes", () => {
  it("keeps the name and redirects to the new address", async () => {
    const agent = await officerWithLink();
    const res = await agent
      .patch("/api/urls/Sunrise-Zoom")
      .send({ originalUrl: "https://zoom.us/j/222" })
      .expect(200);
    expect(res.body).toMatchObject({
      shortId: "sunrise-zoom",
      originalUrl: "https://zoom.us/j/222",
    });

    const redirect = await api().get("/sunrise-zoom").expect(302);
    expect(redirect.headers.location).toBe("https://zoom.us/j/222");
  });

  it("remembers earlier addresses, newest first, and skips no-op changes", async () => {
    const agent = await officerWithLink();
    for (const n of ["222", "333", "333"]) {
      await agent
        .patch("/api/urls/sunrise-zoom")
        .send({ originalUrl: `https://zoom.us/j/${n}` })
        .expect(200);
    }
    const res = await agent.get("/api/urls/sunrise-zoom").expect(200);
    expect(res.body.originalUrl).toBe("https://zoom.us/j/333");
    expect(res.body.stats.history.map((h: { originalUrl: string }) => h.originalUrl)).toEqual([
      "https://zoom.us/j/222",
      "https://zoom.us/j/111",
    ]);
  });

  it("only lets the owner change it, and only to a web address", async () => {
    await officerWithLink();
    const other = await loggedIn({ id: "test|someone-else" });
    await other
      .patch("/api/urls/sunrise-zoom")
      .send({ originalUrl: "https://evil.example" })
      .expect(404);
    await api()
      .patch("/api/urls/sunrise-zoom")
      .send({ originalUrl: "https://x.example" })
      .expect(401);

    const owner = await loggedIn({ id: "test|sunrise-zoom" });
    await owner
      .patch("/api/urls/sunrise-zoom")
      .send({ originalUrl: "javascript:alert(1)" })
      .expect(400);
    const redirect = await api().get("/sunrise-zoom").expect(302);
    expect(redirect.headers.location).toBe("https://zoom.us/j/111");
  });
});

describe("link stats", () => {
  it("counts QR scans separately from typed and clicked links", async () => {
    const agent = await officerWithLink();
    await api().get("/sunrise-zoom?src=qr").expect(302);
    await api().get("/sunrise-zoom?src=qr").expect(302);
    await api().get("/sunrise-zoom").expect(302);

    const res = await agent.get("/api/urls/sunrise-zoom").expect(200);
    expect(res.body.clicks).toBe(3);
    expect(res.body.stats.sources).toEqual({ link: 1, qr: 2 });
  });

  it("gives clicks for each of the last 30 days, including empty days", async () => {
    const agent = await officerWithLink();
    await api().get("/sunrise-zoom").expect(302);
    // One click three days ago, and one too old to show.
    await db().query(
      `INSERT INTO url_clicks (url_id, clicked_at)
       SELECT id, now() - interval '3 days' FROM urls
       UNION ALL SELECT id, now() - interval '40 days' FROM urls`,
    );

    const { daily } = (await agent.get("/api/urls/sunrise-zoom").expect(200)).body.stats;
    expect(daily).toHaveLength(30);
    const today = new Date().toISOString().slice(0, 10);
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    expect(daily.at(-1)).toEqual({ day: today, clicks: 1 });
    expect(daily.find((d: { day: string }) => d.day === threeDaysAgo)?.clicks).toBe(1);
    expect(daily.reduce((n: number, d: { clicks: number }) => n + d.clicks, 0)).toBe(2);
  });
});

describe("preview pages (name+)", () => {
  it("shows where a link goes without going there or counting a click", async () => {
    // & survives URL normalisation (< > " ' don't), so the page itself must escape it.
    const agent = await officerWithLink("club-roles", "https://docs.google.com/sheet?a=1&b='x'");
    const res = await api().get("/Club-Roles+").expect(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    // The host comes from ORIGIN (as configured for the site), not from the request.
    expect(res.text).toContain("localhost:5173/club-roles goes to");
    expect(res.text).toContain(">https://docs.google.com/sheet?a=1&amp;b=%27x%27<");
    expect(res.text).toContain('href="https://docs.google.com/sheet?a=1&amp;b=%27x%27"');
    expect(res.text).not.toContain("a=1&b");

    const stats = await agent.get("/api/urls/club-roles").expect(200);
    expect(stats.body.clicks).toBe(0);
  });

  it("says when there's no such link", async () => {
    const res = await api().get("/no-such-link+").expect(404);
    expect(res.text).toContain("We couldn't find that link");
  });
});
