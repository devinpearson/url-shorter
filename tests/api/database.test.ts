import { describe, expect, it } from "vitest";
import { migrate } from "../../backend/src/db/migrate";
import { findOrCreateUser } from "../../backend/src/db/users";
import { setupApi } from "./helpers";

const { db, loggedIn } = setupApi();

describe("database", () => {
  it("applies each migration once", async () => {
    // setupApi already migrated; a second run (e.g. a restart) has nothing to do.
    expect(await migrate(db())).toEqual([]);
    const { rows } = await db().query("SELECT version FROM schema_migrations ORDER BY version");
    expect(rows.map((r) => r.version)).toContain("001_schema.sql");
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
});
