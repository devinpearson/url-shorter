import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { migrate } from "../../backend/src/db/migrate";
import { createPool } from "../../backend/src/db/pool";

/**
 * A throwaway Postgres for tests: PGlite (Postgres compiled to WebAssembly) behind a local
 * socket, so the app connects with the normal `pg` driver. No Docker needed. The schema
 * comes from the real migrations in backend/migrations.
 */
export async function startTestPostgres() {
  const db = await PGlite.create();
  const server = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 0, maxConnections: 20 });
  await server.start();

  const url = `postgres://postgres@${server.getServerConn()}/postgres`;
  // PGlite is a single Postgres session: queries from several pool connections would interleave
  // (and land inside each other's transactions), so the app gets one connection at a time.
  const pool = createPool(url, 1);
  await migrate(pool);

  return {
    url,
    pool,
    /** Empties every table except the migrations record. */
    async reset() {
      await pool.query(
        "TRUNCATE users, urls, url_clicks, url_destination_history, clubs, club_members, club_invites, contact_messages, session RESTART IDENTITY CASCADE",
      );
    },
    async stop() {
      await pool.end();
      await server.stop();
      await db.close();
    },
  };
}
