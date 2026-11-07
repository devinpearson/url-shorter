import pg from "pg";

/** Postgres's error code for a unique constraint violation. */
const UNIQUE_VIOLATION = "23505";

export function createPool(connectionString: string, max = 10) {
  return new pg.Pool({ connectionString, max });
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; constraint?: string };
  return e.code === UNIQUE_VIOLATION && (!constraint || e.constraint === constraint);
}
