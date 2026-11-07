import pg from "pg";

/** Postgres's error code for a unique constraint violation. */
const UNIQUE_VIOLATION = "23505";

/**
 * A connection pool. With no connection string, pg reads the standard PGHOST, PGPORT,
 * PGUSER, PGPASSWORD and PGDATABASE variables, which is how the production stack connects.
 */
export function createPool(connectionString: string | undefined, max = 10) {
  return new pg.Pool({ connectionString: connectionString || undefined, max });
}

/** True when the environment says how to reach Postgres. */
export function hasDatabaseConfig(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.DATABASE_URL || env.PGHOST);
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; constraint?: string };
  return e.code === UNIQUE_VIOLATION && (!constraint || e.constraint === constraint);
}
