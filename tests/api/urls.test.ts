import { describe, expect, it } from "vitest";
import { setupApi } from "./helpers";

const { api, loggedIn } = setupApi();

describe("short link API", () => {
  it("requires a login to list or create links", async () => {
    await api().get("/api/urls").expect(401);
    await api().post("/api/urls").send({ originalUrl: "https://example.com" }).expect(401);
  });

  it("creates a link with a random 8-character name", async () => {
    const agent = await loggedIn();
    const res = await agent
      .post("/api/urls")
      .send({ originalUrl: "https://example.com/signup" })
      .expect(201);
    expect(res.body.shortId).toMatch(/^[A-Za-z0-9]{8}$/);
    expect(res.body.originalUrl).toBe("https://example.com/signup");
    expect(res.body.clicks).toBe(0);
  });

  it("creates a link with a custom name", async () => {
    const agent = await loggedIn();
    const res = await agent
      .post("/api/urls")
      .send({ originalUrl: "https://example.com", customShortId: "  club-roles  " })
      .expect(201);
    expect(res.body.shortId).toBe("club-roles");
  });

  it.each([["javascript:alert(1)"], ["data:text/html,hi"], ["not a url"], [""]])(
    "rejects %j as a destination",
    async (originalUrl) => {
      const agent = await loggedIn();
      await agent.post("/api/urls").send({ originalUrl }).expect(400);
    },
  );

  it.each([["ab"], ["has space"], ["a/b"], ["x".repeat(33)]])(
    "rejects %j as a custom name",
    async (customShortId) => {
      const agent = await loggedIn();
      const res = await agent
        .post("/api/urls")
        .send({ originalUrl: "https://example.com", customShortId })
        .expect(400);
      expect(res.body.message).toMatch(/3–32 characters/);
    },
  );

  it.each([["login"], ["Dashboard"], ["about"], ["terms"], ["api"]])(
    "rejects the reserved name %j",
    async (customShortId) => {
      const agent = await loggedIn();
      const res = await agent
        .post("/api/urls")
        .send({ originalUrl: "https://example.com", customShortId })
        .expect(400);
      expect(res.body.message).toMatch(/reserved/);
    },
  );

  it("returns 409 for a name that's taken, even when requests race", async () => {
    const agent = await loggedIn();
    const send = () =>
      agent.post("/api/urls").send({ originalUrl: "https://example.com", customShortId: "race" });
    const statuses = (await Promise.all([send(), send(), send()])).map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409]);
  });

  it("lists only the logged-in user's links, newest first", async () => {
    const alice = await loggedIn({ id: "test|alice" });
    const bob = await loggedIn({ id: "test|bob" });
    await alice.post("/api/urls").send({ originalUrl: "https://a.com", customShortId: "first" });
    await alice.post("/api/urls").send({ originalUrl: "https://a.com", customShortId: "second" });
    await bob.post("/api/urls").send({ originalUrl: "https://b.com", customShortId: "bobs" });

    const res = await alice.get("/api/urls").expect(200);
    expect(res.body.map((u: { shortId: string }) => u.shortId)).toEqual(["second", "first"]);
  });

  it("shows stats and deletes only your own links", async () => {
    const alice = await loggedIn({ id: "test|alice" });
    const bob = await loggedIn({ id: "test|bob" });
    await alice.post("/api/urls").send({ originalUrl: "https://a.com", customShortId: "mine" });

    await bob.get("/api/urls/mine").expect(404);
    await bob.delete("/api/urls/mine").expect(404);

    const stats = await alice.get("/api/urls/mine").expect(200);
    expect(stats.body.clicks).toBe(0);
    await alice.delete("/api/urls/mine").expect(200);
    await alice.get("/api/urls/mine").expect(404);
  });
});

describe("short link redirects", () => {
  it("redirects and counts each click", async () => {
    const agent = await loggedIn();
    await agent
      .post("/api/urls")
      .send({ originalUrl: "https://example.com/x", customShortId: "go-now" });

    const res = await api().get("/go-now").expect(302);
    expect(res.headers.location).toBe("https://example.com/x");
    await api().get("/go-now").expect(302);

    const stats = await agent.get("/api/urls/go-now").expect(200);
    expect(stats.body.clicks).toBe(2);
  });

  it("returns 404 for an unknown name", async () => {
    await api().get("/no-such-link").expect(404);
  });
});
