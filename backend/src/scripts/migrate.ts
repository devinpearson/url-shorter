/**
 * Applies pending database migrations.
 *
 *   npm run db:migrate          (development: tsx, reads backend/.env)
 *   node backend/dist/scripts/migrate.js   (production, after npm run build:backend)
 */
import "../env";
import { migrate } from "../db/migrate";
import { createPool, hasDatabaseConfig } from "../db/pool";

if (!hasDatabaseConfig())
  throw new Error("Set DATABASE_URL, or PGHOST and the other PG* variables");

const pool = createPool(process.env.DATABASE_URL, 1);
migrate(pool)
  .then((ran) => {
    console.log(ran.length ? `Applied: ${ran.join(", ")}` : "Database is up to date.");
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
