import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";

export interface Club {
  id: string;
  slug: string;
  name: string;
}

export interface ClubSummary extends Club {
  memberCount: number;
  linkCount: number;
}

export interface ClubDetail extends Club {
  members: { id: string; displayName: string; joinedAt: Date }[];
  /** Invites that haven't been used and haven't expired, newest first. */
  invites: { id: string; createdAt: Date; expiresAt: Date; createdBy: string | null }[];
}

/** How long an invite link works. Long enough to cover a club's handover meeting. */
const INVITE_DAYS = 14;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a club with the user as its first officer. Throws a unique violation if the slug is taken. */
export async function createClub(
  pool: Pool,
  input: { name: string; slug: string; userId: string },
): Promise<Club> {
  const { rows } = await pool.query<Club>(
    `WITH club AS (
       INSERT INTO clubs (slug, name) VALUES ($1, $2) RETURNING id, slug, name
     ), member AS (
       INSERT INTO club_members (club_id, user_id) SELECT id, $3 FROM club
     )
     SELECT * FROM club`,
    [input.slug, input.name, input.userId],
  );
  return rows[0];
}

/** The clubs the user belongs to, by name. */
export async function listClubs(pool: Pool, userId: string): Promise<ClubSummary[]> {
  const { rows } = await pool.query<ClubSummary>(
    `SELECT c.id, c.slug, c.name,
            (SELECT count(*)::int FROM club_members m WHERE m.club_id = c.id) AS "memberCount",
            (SELECT count(*)::int FROM urls u WHERE u.club_id = c.id) AS "linkCount"
     FROM clubs c JOIN club_members me ON me.club_id = c.id AND me.user_id = $1
     ORDER BY lower(c.name), c.slug`,
    [userId],
  );
  return rows;
}

export async function isMember(pool: Pool, clubId: string, userId: string) {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM club_members WHERE club_id = $1 AND user_id = $2",
    [clubId, userId],
  );
  return (rowCount ?? 0) > 0;
}

/** The club with this slug, if the user is one of its members. */
export async function findMemberClub(pool: Pool, slug: string, userId: string) {
  const { rows } = await pool.query<Club>(
    `SELECT c.id, c.slug, c.name FROM clubs c
     JOIN club_members m ON m.club_id = c.id AND m.user_id = $2
     WHERE c.slug = $1`,
    [slug, userId],
  );
  return rows[0] ?? null;
}

export async function getClubDetail(pool: Pool, club: Club): Promise<ClubDetail> {
  const [members, invites] = await Promise.all([
    pool.query<ClubDetail["members"][number]>(
      `SELECT u.id, u.display_name AS "displayName", m.joined_at AS "joinedAt"
       FROM club_members m JOIN users u ON u.id = m.user_id
       WHERE m.club_id = $1 ORDER BY m.joined_at, u.id`,
      [club.id],
    ),
    pool.query<ClubDetail["invites"][number]>(
      `SELECT i.id, i.created_at AS "createdAt", i.expires_at AS "expiresAt",
              u.display_name AS "createdBy"
       FROM club_invites i LEFT JOIN users u ON u.id = i.created_by
       WHERE i.club_id = $1 AND i.used_at IS NULL AND i.expires_at > now()
       ORDER BY i.created_at DESC, i.id`,
      [club.id],
    ),
  ]);
  return { ...club, members: members.rows, invites: invites.rows };
}

export async function renameClub(pool: Pool, clubId: string, name: string) {
  await pool.query("UPDATE clubs SET name = $2 WHERE id = $1", [clubId, name]);
}

/**
 * A new single-use invite link token. Only its hash is stored, so the link can be shown once,
 * when it's made.
 */
export async function createInvite(pool: Pool, input: { clubId: string; userId: string }) {
  const token = randomBytes(18).toString("base64url");
  const { rows } = await pool.query<{ id: string; expiresAt: Date }>(
    `INSERT INTO club_invites (club_id, token_hash, created_by, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(days => $4))
     RETURNING id, expires_at AS "expiresAt"`,
    [input.clubId, hashToken(token), input.userId, INVITE_DAYS],
  );
  return { token, ...rows[0] };
}

/** Returns false when there's no such unused invite for the club. */
export async function cancelInvite(pool: Pool, clubId: string, inviteId: string) {
  const { rowCount } = await pool.query(
    "DELETE FROM club_invites WHERE id = $1 AND club_id = $2 AND used_at IS NULL",
    [inviteId, clubId],
  );
  return (rowCount ?? 0) > 0;
}

export type InviteStatus = "ok" | "used" | "expired";

/** What an invite link is for, so the join page can say which club it is before logging in. */
export async function findInvite(pool: Pool, token: string) {
  const { rows } = await pool.query<{
    clubName: string;
    clubSlug: string;
    invitedBy: string | null;
    status: InviteStatus;
  }>(
    `SELECT c.name AS "clubName", c.slug AS "clubSlug", u.display_name AS "invitedBy",
            CASE WHEN i.used_at IS NOT NULL THEN 'used'
                 WHEN i.expires_at <= now() THEN 'expired'
                 ELSE 'ok' END AS status
     FROM club_invites i JOIN clubs c ON c.id = i.club_id
     LEFT JOIN users u ON u.id = i.created_by
     WHERE i.token_hash = $1`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export type AcceptResult =
  | { ok: true; club: Club }
  | { ok: false; reason: "not-found" | "used" | "expired" };

/**
 * Adds the user to the invite's club and uses the invite up. Someone who is already a member
 * doesn't use it, so they can still pass it on.
 */
export async function acceptInvite(
  pool: Pool,
  token: string,
  userId: string,
): Promise<AcceptResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      inviteId: string;
      usedAt: Date | null;
      expired: boolean;
      id: string;
      slug: string;
      name: string;
      isMember: boolean;
    }>(
      `SELECT i.id AS "inviteId", i.used_at AS "usedAt", i.expires_at <= now() AS expired,
              c.id, c.slug, c.name,
              EXISTS (SELECT 1 FROM club_members m WHERE m.club_id = c.id AND m.user_id = $2)
                AS "isMember"
       FROM club_invites i JOIN clubs c ON c.id = i.club_id
       WHERE i.token_hash = $1
       FOR UPDATE OF i`,
      [hashToken(token), userId],
    );
    const invite = rows[0];
    const club = invite && { id: invite.id, slug: invite.slug, name: invite.name };
    if (!invite || !club) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "not-found" };
    }
    if (invite.isMember) {
      await client.query("ROLLBACK");
      return { ok: true, club };
    }
    if (invite.usedAt || invite.expired) {
      await client.query("ROLLBACK");
      return { ok: false, reason: invite.usedAt ? "used" : "expired" };
    }
    await client.query("INSERT INTO club_members (club_id, user_id) VALUES ($1, $2)", [
      club.id,
      userId,
    ]);
    await client.query("UPDATE club_invites SET used_at = now(), used_by = $2 WHERE id = $1", [
      invite.inviteId,
      userId,
    ]);
    await client.query("COMMIT");
    return { ok: true, club };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export type RemoveResult = "removed" | "not-found" | "last-member";

/**
 * Takes someone off a club (or lets them leave). The last officer can't leave, so the club's
 * links always have someone looking after them.
 */
export async function removeMember(
  pool: Pool,
  clubId: string,
  memberId: string,
): Promise<RemoveResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Lock the club so two officers leaving at once can't both go.
    await client.query("SELECT 1 FROM clubs WHERE id = $1 FOR UPDATE", [clubId]);
    const { rows } = await client.query<{ count: number; isMember: boolean }>(
      `SELECT count(*)::int AS count, bool_or(user_id = $2) AS "isMember"
       FROM club_members WHERE club_id = $1`,
      [clubId, memberId],
    );
    const { count, isMember } = rows[0];
    let result: RemoveResult = "removed";
    if (!isMember) result = "not-found";
    else if (count <= 1) result = "last-member";
    else {
      await client.query("DELETE FROM club_members WHERE club_id = $1 AND user_id = $2", [
        clubId,
        memberId,
      ]);
    }
    await client.query(result === "removed" ? "COMMIT" : "ROLLBACK");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export interface ClubPage {
  name: string;
  slug: string;
  links: { shortId: string; title: string | null }[];
}

/** The public club page: the club's name and the links its officers chose to list. */
export async function getClubPage(pool: Pool, slug: string): Promise<ClubPage | null> {
  const { rows } = await pool.query<{
    name: string;
    slug: string;
    shortId: string | null;
    title: string | null;
  }>(
    `SELECT c.name, c.slug, u.short_id AS "shortId", u.title
     FROM clubs c LEFT JOIN urls u ON u.club_id = c.id AND u.on_club_page
     WHERE c.slug = $1
     ORDER BY lower(coalesce(u.title, u.short_id)), u.short_id`,
    [slug],
  );
  if (rows.length === 0) return null;
  return {
    name: rows[0].name,
    slug: rows[0].slug,
    links: rows.flatMap((r) => (r.shortId ? [{ shortId: r.shortId, title: r.title }] : [])),
  };
}
