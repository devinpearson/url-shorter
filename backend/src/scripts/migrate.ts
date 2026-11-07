/**
 * Applies pending database migrations.
 *
 *   npm run db:migrate          (development: tsx, reads backend/.env)
 *   node backend/dist/scripts/migrate.js   (production, after npm run build:backend)
 */
import "../env";
import { migrate } from "../db/migrate";
import { createPool } from "../db/pool";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL must be set");

const pool = createPool(url, 1);
migrate(pool)
  .then((ran) => {
    console.log(ran.length ? `Applied: ${ran.join(", ")}` : "Database is up to date.");
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
