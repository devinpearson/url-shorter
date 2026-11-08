import type { Pool } from "pg";

export interface ShortUrl {
  id: string;
  shortId: string;
  originalUrl: string;
  clicks: number;
  createdAt: Date;
  /** The latest click, or null if the link has never been opened. */
  lastClickedAt: Date | null;
  /** A friendly label, e.g. "Weekly meeting (Zoom)". */
  title: string | null;
  /** The club that looks after it, or null for a personal link. */
  clubId: string | null;
  /** Listed on the club's public page. */
  onClubPage: boolean;
}

const COLUMNS = `id, short_id AS "shortId", original_url AS "originalUrl", clicks,
  created_at AS "createdAt", last_clicked_at AS "lastClickedAt", title, club_id AS "clubId",
  on_club_page AS "onClubPage"`;

/**
 * SQL for "the user (parameter `param`) can manage this link": they made it and it's personal,
 * or it belongs to one of their clubs.
 */
const canManage = (param: string) =>
  `((club_id IS NULL AND user_id = ${param})
    OR club_id IN (SELECT club_id FROM club_members WHERE user_id = ${param}))`;

/** Throws a unique violation (see isUniqueViolation) when the short id is taken. */
export async function createUrl(
  pool: Pool,
  input: { shortId: string; originalUrl: string; userId: string; clubId?: string | null },
): Promise<ShortUrl> {
  const { rows } = await pool.query<ShortUrl>(
    `INSERT INTO urls (short_id, original_url, user_id, club_id) VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    [input.shortId, input.originalUrl, input.userId, input.clubId ?? null],
  );
  return rows[0];
}

/** The user's personal links and their clubs' links, newest first. */
export async function listUrls(pool: Pool, userId: string): Promise<ShortUrl[]> {
  const { rows } = await pool.query<ShortUrl>(
    `SELECT ${COLUMNS} FROM urls WHERE ${canManage("$1")} ORDER BY created_at DESC, id`,
    [userId],
  );
  return rows;
}

export async function findUrl(pool: Pool, shortId: string, userId: string) {
  const { rows } = await pool.query<ShortUrl>(
    `SELECT ${COLUMNS} FROM urls WHERE short_id = $1 AND ${canManage("$2")}`,
    [shortId, userId],
  );
  return rows[0] ?? null;
}

/** Returns false when the link doesn't exist or the user can't manage it. */
export async function deleteUrl(pool: Pool, shortId: string, userId: string) {
  const { rowCount } = await pool.query(
    `DELETE FROM urls WHERE short_id = $1 AND ${canManage("$2")}`,
    [shortId, userId],
  );
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

export interface LinkChanges {
  /** A new destination; the old one is kept in the history. */
  originalUrl?: string;
  /** A friendly label; empty or null clears it. */
  title?: string | null;
  /** Hand the link to a club (its id), or null to make it the user's own. */
  clubId?: string | null;
  onClubPage?: boolean;
}

export type UpdateResult =
  | { ok: true; url: ShortUrl }
  | { ok: false; reason: "not-found" | "not-a-member" };

/**
 * Changes a link the user can manage, keeping the old destination in the history. Moving a
 * link to a club needs membership of that club; making it personal makes the user its owner.
 */
export async function updateLink(
  pool: Pool,
  input: { shortId: string; userId: string; changes: LinkChanges },
): Promise<UpdateResult> {
  const { shortId, userId, changes } = input;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: found } = await client.query<{
      id: string;
      originalUrl: string;
      clubId: string | null;
    }>(
      `SELECT id, original_url AS "originalUrl", club_id AS "clubId" FROM urls
       WHERE short_id = $1 AND ${canManage("$2")} FOR UPDATE`,
      [shortId, userId],
    );
    const old = found[0];
    if (!old) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "not-found" };
    }

    if (changes.clubId) {
      const member = await client.query(
        "SELECT 1 FROM club_members WHERE club_id = $1 AND user_id = $2",
        [changes.clubId, userId],
      );
      if (member.rowCount === 0) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "not-a-member" };
      }
    }

    const sets: string[] = [];
    const values: unknown[] = [old.id];
    const set = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (changes.originalUrl !== undefined && changes.originalUrl !== old.originalUrl) {
      await client.query(
        "INSERT INTO url_destination_history (url_id, original_url) VALUES ($1, $2)",
        [old.id, old.originalUrl],
      );
      set("original_url", changes.originalUrl);
    }
    if (changes.title !== undefined) set("title", changes.title?.trim() || null);
    if (changes.clubId !== undefined) {
      set("club_id", changes.clubId);
      if (changes.clubId === null) set("user_id", userId);
    }
    // Only club links can be on a club page.
    const clubAfter = changes.clubId !== undefined ? changes.clubId : old.clubId;
    if (clubAfter === null) set("on_club_page", false);
    else if (changes.onClubPage !== undefined) set("on_club_page", changes.onClubPage);

    const { rows } = await client.query<ShortUrl>(
      sets.length
        ? `UPDATE urls SET ${sets.join(", ")} WHERE id = $1 RETURNING ${COLUMNS}`
        : `SELECT ${COLUMNS} FROM urls WHERE id = $1`,
      values,
    );
    await client.query("COMMIT");
    return { ok: true, url: rows[0] };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
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
