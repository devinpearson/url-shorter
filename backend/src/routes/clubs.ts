import { type Request, type Response, Router } from "express";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import {
  acceptInvite,
  cancelInvite,
  createClub,
  createInvite,
  findInvite,
  findMemberClub,
  getClubDetail,
  getClubPage,
  listClubs,
  removeMember,
  renameClub,
} from "../db/clubs";
import { isUniqueViolation } from "../db/pool";
import { ensureAuth } from "../middleware/auth";
import { isValidShortName, normalizeShortName } from "../shortNames";
import { asyncHandler, isUuid, userId } from "./common";

const NOT_FOUND = { message: "Not found" };

function clubName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 1 && name.length <= 100 ? name : null;
}

/** The club in the URL, if the logged-in user is one of its officers; otherwise answers 404. */
async function memberClub(pool: Pool, req: Request, res: Response) {
  const club = await findMemberClub(pool, normalizeShortName(req.params.slug), userId(req));
  if (!club) res.status(404).json(NOT_FOUND);
  return club;
}

/** /api/clubs: a user's clubs, their officers and invites, and the public club pages. */
export function clubsRouter(pool: Pool) {
  const router = Router();

  const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many clubs or invites at once. Please try again later." },
  });

  // Public: a club's page, toast.li/c/<slug>, listing the links its officers chose to show.
  router.get(
    "/:slug/page",
    asyncHandler(async (req, res) => {
      const page = await getClubPage(pool, normalizeShortName(req.params.slug));
      if (!page) {
        res.status(404).json(NOT_FOUND);
        return;
      }
      res.json(page);
    }),
  );

  router.get(
    "/",
    ensureAuth,
    asyncHandler(async (req, res) => {
      res.json(await listClubs(pool, userId(req)));
    }),
  );

  router.post(
    "/",
    ensureAuth,
    createLimiter,
    asyncHandler(async (req, res) => {
      const name = clubName(req.body?.name);
      if (!name) {
        res.status(400).json({ message: "Please enter your club's name." });
        return;
      }
      const slug = normalizeShortName(
        typeof req.body?.slug === "string" && req.body.slug.trim() ? req.body.slug : name,
      );
      if (!isValidShortName(slug)) {
        res.status(400).json({
          message:
            "The club page address can use letters, numbers and dashes, and must be 3–32 characters long.",
        });
        return;
      }
      try {
        const club = await createClub(pool, { name, slug, userId: userId(req) });
        res.status(201).json(club);
      } catch (err) {
        if (!isUniqueViolation(err, "clubs_slug_key")) throw err;
        res.status(409).json({
          message:
            "That club page address is taken. If it's your club, ask its officers for an invite.",
        });
      }
    }),
  );

  router.get(
    "/:slug",
    ensureAuth,
    asyncHandler(async (req, res) => {
      const club = await memberClub(pool, req, res);
      if (!club) return;
      res.json(await getClubDetail(pool, club));
    }),
  );

  router.patch(
    "/:slug",
    ensureAuth,
    asyncHandler(async (req, res) => {
      const club = await memberClub(pool, req, res);
      if (!club) return;
      const name = clubName(req.body?.name);
      if (!name) {
        res.status(400).json({ message: "Please enter your club's name." });
        return;
      }
      await renameClub(pool, club.id, name);
      res.json({ ...club, name });
    }),
  );

  // A single-use invite link for another officer, e.g. the incoming VP Public Relations.
  router.post(
    "/:slug/invites",
    ensureAuth,
    createLimiter,
    asyncHandler(async (req, res) => {
      const club = await memberClub(pool, req, res);
      if (!club) return;
      res.status(201).json(await createInvite(pool, { clubId: club.id, userId: userId(req) }));
    }),
  );

  router.delete(
    "/:slug/invites/:inviteId",
    ensureAuth,
    asyncHandler(async (req, res) => {
      const club = await memberClub(pool, req, res);
      if (!club) return;
      if (
        !isUuid(req.params.inviteId) ||
        !(await cancelInvite(pool, club.id, req.params.inviteId))
      ) {
        res.status(404).json(NOT_FOUND);
        return;
      }
      res.json({ message: "Cancelled" });
    }),
  );

  // Take an officer off the club, or leave it yourself (your own id).
  router.delete(
    "/:slug/members/:userId",
    ensureAuth,
    asyncHandler(async (req, res) => {
      const club = await memberClub(pool, req, res);
      if (!club) return;
      const result = isUuid(req.params.userId)
        ? await removeMember(pool, club.id, req.params.userId)
        : "not-found";
      if (result === "not-found") {
        res.status(404).json(NOT_FOUND);
        return;
      }
      if (result === "last-member") {
        res.status(400).json({
          message:
            "Someone has to look after the club's links. Invite the next officer before you leave.",
        });
        return;
      }
      res.json({ message: "Removed" });
    }),
  );

  return router;
}

/** /api/invites/<token>: what an invite is for (public), and accepting it (logged in). */
export function invitesRouter(pool: Pool) {
  const router = Router();

  router.get(
    "/:token",
    asyncHandler(async (req, res) => {
      const invite = await findInvite(pool, req.params.token);
      if (!invite) {
        res.status(404).json({ message: "That invite link isn't right. Ask for a new one." });
        return;
      }
      res.json(invite);
    }),
  );

  router.post(
    "/:token/accept",
    ensureAuth,
    asyncHandler(async (req, res) => {
      const result = await acceptInvite(pool, req.params.token, userId(req));
      if (result.ok) {
        res.json(result.club);
        return;
      }
      const messages = {
        "not-found": "That invite link isn't right. Ask for a new one.",
        used: "That invite link has already been used. Ask the club's officers for a new one.",
        expired: "That invite link has expired. Ask the club's officers for a new one.",
      };
      res
        .status(result.reason === "not-found" ? 404 : 410)
        .json({ message: messages[result.reason] });
    }),
  );

  return router;
}
