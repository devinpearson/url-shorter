import request from "supertest";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { createApp } from "../../backend/src/app";
import { startTestPostgres } from "../support/postgres";

type TestPostgres = Awaited<ReturnType<typeof startTestPostgres>>;

/**
 * Starts a throwaway Postgres for one test file, and builds a fresh Express app and empties
 * the tables before each test. Use `api()` for anonymous requests, `loggedIn()` for an agent
 * that keeps a logged-in session cookie, and `db()` to query the database directly.
 */
export function setupApi(options: { staticDir?: string } = {}) {
  let pg: TestPostgres;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    pg = await startTestPostgres();
  });

  beforeEach(async () => {
    await pg.reset();
    // A fresh app per test also resets the rate limiters.
    app = createApp({
      pool: pg.pool,
      sessionSecret: "test-secret",
      origin: process.env.ORIGIN,
      enableTestLogin: true,
      staticDir: options.staticDir,
    });
  });

  afterAll(async () => {
    await pg?.stop();
  });

  return {
    api: () => request(app),
    db: () => pg.pool,
    async loggedIn(user: { id?: string; displayName?: string; email?: string } = {}) {
      const agent = request.agent(app);
      await agent.post("/api/test/login").send(user).expect(200);
      return agent;
    },
  };
}
