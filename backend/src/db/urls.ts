import type { Pool } from "pg";

export interface ShortUrl {
  id: string;
  shortId: string;
  originalUrl: string;
  clicks: number;
  createdAt: Date;
  /** The latest click, or null if the link has never been opened. */
  lastClickedAt: Date | null;
}

const COLUMNS = `id, short_id AS "shortId", original_url AS "originalUrl", clicks,
  created_at AS "createdAt", last_clicked_at AS "lastClickedAt"`;

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

/**
 * Counts a click, records when it happened, and returns where the link goes (null for an
 * unknown name). One statement, so the count, last click and history always agree.
 */
export async function recordClick(pool: Pool, shortId: string): Promise<string | null> {
  const { rows } = await pool.query<{ originalUrl: string }>(
    `WITH hit AS (
       UPDATE urls SET clicks = clicks + 1, last_clicked_at = now()
       WHERE short_id = $1
       RETURNING id, original_url
     ), logged AS (
       INSERT INTO url_clicks (url_id) SELECT id FROM hit
     )
     SELECT original_url AS "originalUrl" FROM hit`,
    [shortId],
  );
  return rows[0]?.originalUrl ?? null;
}

export interface InactiveUrl {
  shortId: string;
  originalUrl: string;
  ownerEmail: string | null;
  clicks: number;
  createdAt: Date;
  lastClickedAt: Date | null;
}

/**
 * Links with no click since `since` (or, if never clicked, created before it), oldest activity
 * first: the candidates for releasing their names.
 */
export async function findInactiveUrls(pool: Pool, since: Date): Promise<InactiveUrl[]> {
  const { rows } = await pool.query<InactiveUrl>(
    `SELECT u.short_id AS "shortId", u.original_url AS "originalUrl", users.email AS "ownerEmail",
            u.clicks, u.created_at AS "createdAt", u.last_clicked_at AS "lastClickedAt"
     FROM urls u JOIN users ON users.id = u.user_id
     WHERE coalesce(u.last_clicked_at, u.created_at) < $1
     ORDER BY coalesce(u.last_clicked_at, u.created_at), u.short_id`,
    [since],
  );
  return rows;
}
