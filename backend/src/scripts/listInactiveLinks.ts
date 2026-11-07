/**
 * Lists links nobody has clicked for a while: the candidates for releasing their names.
 * It only reports; nothing is deleted.
 *
 *   npm run links:inactive               (no clicks for 365 days)
 *   npm run links:inactive -- 180        (no clicks for 180 days)
 *   node backend/dist/scripts/listInactiveLinks.js 180   (production)
 */
import "../env";
import { createPool } from "../db/pool";
import { findInactiveUrls } from "../db/urls";

const days = Number(process.argv[2] ?? 365);
if (!Number.isFinite(days) || days <= 0) throw new Error("Pass the number of days, e.g. 365");

const pool = createPool(process.env.DATABASE_URL, 1);
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "never");

findInactiveUrls(pool, since)
  .then((rows) => {
    console.log(`${rows.length} link(s) with no clicks since ${day(since)}:`);
    for (const r of rows) {
      console.log(
        `  ${r.shortId}  last clicked ${day(r.lastClickedAt)}, created ${day(r.createdAt)}, ` +
          `${r.clicks} click(s), owner ${r.ownerEmail ?? "(no email)"}`,
      );
    }
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
