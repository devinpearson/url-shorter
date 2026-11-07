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

export type ClickSource = "link" | "qr";

/**
 * Counts a click, records when it happened and where from, and returns where the link goes
 * (null for an unknown name). One statement, so the count, last click and history agree.
 */
export async function recordClick(
  pool: Pool,
  shortId: string,
  source: ClickSource = "link",
): Promise<string | null> {
  const { rows } = await pool.query<{ originalUrl: string }>(
    `WITH hit AS (
       UPDATE urls SET clicks = clicks + 1, last_clicked_at = now()
       WHERE short_id = $1
       RETURNING id, original_url
     ), logged AS (
       INSERT INTO url_clicks (url_id, source) SELECT id, $2 FROM hit
     )
     SELECT original_url AS "originalUrl" FROM hit`,
    [shortId, source],
  );
  return rows[0]?.originalUrl ?? null;
}

/** Where a link goes, without counting a click (for the preview page). */
export async function findDestination(pool: Pool, shortId: string): Promise<string | null> {
  const { rows } = await pool.query<{ originalUrl: string }>(
    `SELECT original_url AS "originalUrl" FROM urls WHERE short_id = $1`,
    [shortId],
  );
  return rows[0]?.originalUrl ?? null;
}

/**
 * Points one of the user's links somewhere new, keeping the old address in the history.
 * Returns null when the link doesn't exist or belongs to someone else.
 */
export async function updateDestination(
  pool: Pool,
  input: { shortId: string; userId: string; originalUrl: string },
): Promise<ShortUrl | null> {
  const { rows } = await pool.query<ShortUrl>(
    `WITH old AS (
       SELECT id, original_url FROM urls WHERE short_id = $1 AND user_id = $2 FOR UPDATE
     ), history AS (
       INSERT INTO url_destination_history (url_id, original_url)
       SELECT id, original_url FROM old WHERE original_url <> $3
     ), updated AS (
       UPDATE urls SET original_url = $3 FROM old WHERE urls.id = old.id RETURNING urls.*
     )
     SELECT ${COLUMNS} FROM updated`,
    [input.shortId, input.userId, input.originalUrl],
  );
  return rows[0] ?? null;
}

export interface UrlStats {
  /** One entry per day for the last `days` days (UTC), oldest first, including empty days. */
  daily: { day: string; clicks: number }[];
  /** All-time clicks by where they came from. */
  sources: Record<ClickSource, number>;
  /** Earlier destinations, newest first. */
  history: { originalUrl: string; replacedAt: Date }[];
}

export async function getUrlStats(pool: Pool, urlId: string, days = 30): Promise<UrlStats> {
  const [daily, sources, history] = await Promise.all([
    pool.query<{ day: string; clicks: number }>(
      `SELECT to_char(d.day, 'YYYY-MM-DD') AS day, count(c.id)::int AS clicks
       FROM generate_series(
              (now() AT TIME ZONE 'UTC')::date - ($2::int - 1),
              (now() AT TIME ZONE 'UTC')::date,
              interval '1 day'
            ) AS d(day)
       LEFT JOIN url_clicks c
         ON c.url_id = $1 AND (c.clicked_at AT TIME ZONE 'UTC')::date = d.day::date
       GROUP BY d.day ORDER BY d.day`,
      [urlId, days],
    ),
    pool.query<{ source: ClickSource; clicks: number }>(
      `SELECT source, count(*)::int AS clicks FROM url_clicks WHERE url_id = $1 GROUP BY source`,
      [urlId],
    ),
    pool.query<{ originalUrl: string; replacedAt: Date }>(
      `SELECT original_url AS "originalUrl", replaced_at AS "replacedAt"
       FROM url_destination_history WHERE url_id = $1 ORDER BY replaced_at DESC, id DESC`,
      [urlId],
    ),
  ]);
  const bySource: Record<ClickSource, number> = { link: 0, qr: 0 };
  for (const row of sources.rows) bySource[row.source] = row.clicks;
  return { daily: daily.rows, sources: bySource, history: history.rows };
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
