import type { Pool } from "pg";

export interface ShortUrl {
  id: string;
  shortId: string;
  originalUrl: string;
  clicks: number;
  createdAt: Date;
}

const COLUMNS = `id, short_id AS "shortId", original_url AS "originalUrl", clicks,
  created_at AS "createdAt"`;

/** Throws a unique violation (see isUniqueViolation) when the short id is taken. */
export async function createUrl(
  pool: Pool,
  input: { shortId: string; originalUrl: string; userId: string },
): Promise<ShortUrl> {
  const { rows } = await pool.query<ShortUrl>(
    `INSERT INTO urls (short_id, original_url, user_id) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
    [input.shortId, input.originalUrl, input.userId],
  );
  return rows[0];
}

export async function listUrls(pool: Pool, userId: string): Promise<ShortUrl[]> {
  const { rows } = await pool.query<ShortUrl>(
    `SELECT ${COLUMNS} FROM urls WHERE user_id = $1 ORDER BY created_at DESC, id`,
    [userId],
  );
  return rows;
}

export async function findUrl(pool: Pool, shortId: string, userId: string) {
  const { rows } = await pool.query<ShortUrl>(
    `SELECT ${COLUMNS} FROM urls WHERE short_id = $1 AND user_id = $2`,
    [shortId, userId],
  );
  return rows[0] ?? null;
}

/** Returns false when the link doesn't exist or belongs to someone else. */
export async function deleteUrl(pool: Pool, shortId: string, userId: string) {
  const { rowCount } = await pool.query("DELETE FROM urls WHERE short_id = $1 AND user_id = $2", [
    shortId,
    userId,
  ]);
  return (rowCount ?? 0) > 0;
}

/** Counts a click and returns where the link goes, or null for an unknown name. */
export async function recordClick(pool: Pool, shortId: string): Promise<string | null> {
  const { rows } = await pool.query<{ originalUrl: string }>(
    `UPDATE urls SET clicks = clicks + 1 WHERE short_id = $1 RETURNING original_url AS "originalUrl"`,
    [shortId],
  );
  return rows[0]?.originalUrl ?? null;
}
