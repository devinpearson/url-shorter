import "./env"; // must stay first: loads .env before other modules read process.env
import { createApp } from "./app";
import { migrate } from "./db/migrate";
import { createPool } from "./db/pool";

const { DATABASE_URL, SESSION_SECRET } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL must be set");
if (!SESSION_SECRET) throw new Error("SESSION_SECRET must be set");

const pool = createPool(DATABASE_URL);
const PORT = process.env.PORT || 5001;

async function start() {
  // Bring the schema up to date first; an advisory lock keeps parallel starts safe.
  const ran = await migrate(pool);
  if (ran.length) console.log(`Applied migrations: ${ran.join(", ")}`);

  const app = createApp({
    pool,
    sessionSecret: SESSION_SECRET as string,
    origin: process.env.ORIGIN,
    secureCookies: process.env.NODE_ENV === "production",
  });
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(async (err) => {
  console.error("Startup failed:", err);
  await pool.end().catch(() => {});
  process.exit(1);
});
