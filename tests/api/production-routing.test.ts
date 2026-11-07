import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { setupApi } from "./helpers";

// A stand-in for dist/: what `vite build` produces.
const dist = mkdtempSync(path.join(tmpdir(), "club-links-dist-"));
writeFileSync(path.join(dist, "index.html"), "<!doctype html><title>Club Links app</title>");
writeFileSync(path.join(dist, "favicon.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
mkdirSync(path.join(dist, "assets"));
writeFileSync(path.join(dist, "assets", "index-abc123.js"), "console.log('app')");

const { api, loggedIn } = setupApi({ staticDir: dist });

describe("one container serving the app, API and short links", () => {
  it.each(["/", "/dashboard", "/About", "/TERMS", "/login?next=/dashboard", "/stats/club-roles"])(
    "serves the app for %s",
    async (route) => {
      const res = await api().get(route).expect(200);
      expect(res.text).toContain("Club Links app");
      expect(res.headers["cache-control"]).toBe("no-cache");
    },
  );

  it("serves static files, caching hashed assets for a year", async () => {
    const icon = await api().get("/favicon.svg").expect(200);
    expect(icon.headers["content-type"]).toMatch(/svg/);
    const asset = await api().get("/assets/index-abc123.js").expect(200);
    expect(asset.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  it("redirects short links, in any case", async () => {
    const agent = await loggedIn();
    await agent
      .post("/api/urls")
      .send({ originalUrl: "https://example.com/zoom", customShortId: "sunrise-zoom" });
    const res = await api().get("/Sunrise-Zoom").expect(302);
    expect(res.headers.location).toBe("https://example.com/zoom");
  });

  it("explains a mistyped short link in plain words", async () => {
    const res = await api().get("/brave-otter-47").expect(404);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain("We couldn't find that link");
  });

  it("answers unknown API paths with JSON, not the app", async () => {
    const res = await api().get("/api/nope").expect(404);
    expect(res.body).toEqual({ message: "Not found" });
  });

  it("hands deeper unknown paths to the app, which sends visitors home", async () => {
    const res = await api().get("/some/old/page").expect(200);
    expect(res.text).toContain("Club Links app");
  });

  it("reports healthy when the database answers", async () => {
    const res = await api().get("/api/health").expect(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
