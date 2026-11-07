import { describe, expect, it } from "vitest";
import { migrate } from "../../backend/src/db/migrate";
import { findInactiveUrls } from "../../backend/src/db/urls";
import { findOrCreateUser } from "../../backend/src/db/users";
import { setupApi } from "./helpers";

const { api, db, loggedIn } = setupApi();

describe("database", () => {
  it("applies each migration once", async () => {
    // setupApi already migrated; a second run (e.g. a restart) has nothing to do.
    expect(await migrate(db())).toEqual([]);
    const { rows } = await db().query("SELECT version FROM schema_migrations ORDER BY version");
    expect(rows.map((r) => r.version)).toEqual(["001_schema.sql", "002_click_tracking.sql"]);
  });

  it("reuses the user on repeat logins, even when they race", async () => {
    const input = { auth0Id: "google-oauth2|42", displayName: "Ada", email: "ada@example.com" };
    const [a, b, c] = await Promise.all([
      findOrCreateUser(db(), input),
      findOrCreateUser(db(), input),
      findOrCreateUser(db(), input),
    ]);
    expect(new Set([a.id, b.id, c.id]).size).toBe(1);
    const { rows } = await db().query("SELECT count(*)::int AS n FROM users");
    expect(rows[0].n).toBe(1);
  });

  it("lets several users have no email", async () => {
    await findOrCreateUser(db(), { auth0Id: "a", displayName: "A" });
    await findOrCreateUser(db(), { auth0Id: "b", displayName: "B", email: "" });
    const { rows } = await db().query("SELECT email FROM users ORDER BY auth0_id");
    expect(rows).toEqual([{ email: null }, { email: null }]);
  });

  it("stores login sessions in Postgres", async () => {
    await loggedIn();
    const { rows } = await db().query("SELECT sess FROM session");
    expect(rows).toHaveLength(1);
    expect(rows[0].sess.passport.user).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("deletes a user's links with the user", async () => {
    const agent = await loggedIn({ id: "test|leaving" });
    await agent
      .post("/api/urls")
      .send({ originalUrl: "https://example.com", customShortId: "bye" });
    await db().query("DELETE FROM users WHERE auth0_id = 'test|leaving'");
    const { rows } = await db().query("SELECT count(*)::int AS n FROM urls");
    expect(rows[0].n).toBe(0);
  });

  it("records when each click happens", async () => {
    const agent = await loggedIn();
    await agent
      .post("/api/urls")
      .send({ originalUrl: "https://example.com", customShortId: "tick" });
    const before = await agent.get("/api/urls/tick").expect(200);
    expect(before.body.lastClickedAt).toBeNull();

    const start = Date.now();
    await api().get("/tick").expect(302);
    await api().get("/TICK").expect(302);

    const after = await agent.get("/api/urls/tick").expect(200);
    expect(after.body.clicks).toBe(2);
    expect(new Date(after.body.lastClickedAt).getTime()).toBeGreaterThanOrEqual(start - 1000);

    const { rows } = await db().query(
      `SELECT c.clicked_at FROM url_clicks c JOIN urls u ON u.id = c.url_id WHERE u.short_id = 'tick'`,
    );
    expect(rows).toHaveLength(2);
  });

  it("finds links nobody has clicked for a while", async () => {
    const agent = await loggedIn({ email: "owner@example.com" });
    for (const name of ["stale-used", "stale-never", "fresh-used", "fresh-new"]) {
      await agent
        .post("/api/urls")
        .send({ originalUrl: "https://example.com", customShortId: name });
    }
    await api().get("/stale-used").expect(302);
    await api().get("/fresh-used").expect(302);
    // Age everything, then make two of them recent again.
    await db().query(
      `UPDATE urls SET created_at = now() - interval '400 days',
         last_clicked_at = CASE WHEN last_clicked_at IS NULL THEN NULL ELSE now() - interval '400 days' END`,
    );
    await db().query(`UPDATE urls SET last_clicked_at = now() WHERE short_id = 'fresh-used'`);
    await db().query(`UPDATE urls SET created_at = now() WHERE short_id = 'fresh-new'`);

    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const inactive = await findInactiveUrls(db(), yearAgo);
    expect(inactive.map((u) => u.shortId).sort()).toEqual(["stale-never", "stale-used"]);
    expect(inactive[0].ownerEmail).toBe("owner@example.com");
  });

  it("deletes a link's click history with the link", async () => {
    const agent = await loggedIn();
    await agent
      .post("/api/urls")
      .send({ originalUrl: "https://example.com", customShortId: "gone" });
    await api().get("/gone").expect(302);
    await agent.delete("/api/urls/gone").expect(200);
    const { rows } = await db().query("SELECT count(*)::int AS n FROM url_clicks");
    expect(rows[0].n).toBe(0);
  });
});
