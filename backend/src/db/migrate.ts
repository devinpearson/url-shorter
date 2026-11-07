import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Pool } from "pg";

/** backend/migrations, from both backend/src/db (tsx, tests) and backend/dist/db (production). */
const MIGRATIONS_DIR = path.join(__dirname, "../../migrations");
// Any fixed number: stops two processes (e.g. two pm2 instances) migrating at once.
const ADVISORY_LOCK_KEY = 74_210_001;

/**
 * Applies the numbered .sql files in backend/migrations that haven't run yet, in order,
 * each in its own transaction, and records them in schema_migrations.
 * Returns the names of the files it applied.
 */
export async function migrate(pool: Pool, dir = MIGRATIONS_DIR): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query<{ version: string }>(
      "SELECT version FROM schema_migrations",
    );
    const applied = new Set(rows.map((r) => r.version));
    const files = (await readdir(dir)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();

    const ran: string[] = [];
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`, { cause: err });
      }
      ran.push(file);
    }
    return ran;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]).catch(() => {});
    client.release();
  }
}
