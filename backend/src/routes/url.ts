import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import { APP_PAGES } from "../appPages";
import { isMember } from "../db/clubs";
import { isUniqueViolation } from "../db/pool";
import {
  createUrl,
  deleteUrl,
  findUrl,
  getUrlStats,
  type LinkChanges,
  listUrls,
  updateLink,
} from "../db/urls";
import { ensureAuth } from "../middleware/auth";
import { generateShortName, isValidShortName, normalizeShortName } from "../shortNames";
import { asyncHandler, isUuid, userId } from "./common";

/** How many times to retry when a generated name is already taken (rare: 262k names). */
const GENERATE_ATTEMPTS = 5;

// Paths used by the frontend or API that a custom short name must not shadow.
const RESERVED_SHORT_IDS = new Set<string>([
  ...APP_PAGES,
  "api",
  "logout",
  "assets",
  "static",
  "privacy",
  "portrait.png",
  "favicon.ico",
  "favicon.svg",
  "robots.txt",
  "sitemap.xml",
  "index.html",
]);

function parseHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const BAD_URL = { message: "Please enter a valid http:// or https:// URL." };
const NOT_A_MEMBER = { message: "You're not an officer of that club." };

/**
 * Reads the fields of a link edit. Returns the changes, or a message for the first field
 * that isn't valid.
 */
function parseLinkChanges(body: Record<string, unknown>): LinkChanges | { error: string } {
  const changes: LinkChanges = {};
  if (body.originalUrl !== undefined) {
    const originalUrl = parseHttpUrl(body.originalUrl);
    if (!originalUrl) return { error: BAD_URL.message };
    changes.originalUrl = originalUrl;
  }
  if (body.title !== undefined) {
    if (body.title !== null && (typeof body.title !== "string" || body.title.trim().length > 100))
      return { error: "Keep the label to 100 characters or fewer." };
    changes.title = body.title;
  }
  if (body.clubId !== undefined) {
    if (body.clubId !== null && !isUuid(body.clubId)) return { error: "Unknown club." };
    changes.clubId = body.clubId;
  }
  if (body.onClubPage !== undefined) {
    if (typeof body.onClubPage !== "boolean") return { error: "onClubPage must be true or false." };
    changes.onClubPage = body.onClubPage;
  }
  return changes;
}

/** Builds the short link router. Each call gets its own rate limiter, so tests can start fresh. */
export function urlRouter(pool: Pool) {
  const router = Router();

  const createLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many links created. Please wait a minute and try again." },
  });

  router.use(ensureAuth);

  // Create a short URL
  router.post(
    "/",
    createLimiter,
    asyncHandler(async (req, res) => {
      const originalUrl = parseHttpUrl(req.body?.originalUrl);
      if (!originalUrl) {
        res.status(400).json(BAD_URL);
        return;
      }

      // Made for a club: any of its officers can then look after it.
      const clubId: unknown = req.body?.clubId ?? null;
      if (clubId !== null) {
        if (!isUuid(clubId) || !(await isMember(pool, clubId, userId(req)))) {
          res.status(403).json(NOT_A_MEMBER);
          return;
        }
      }

      const custom =
        typeof req.body?.customShortId === "string"
          ? normalizeShortName(req.body.customShortId)
          : "";

      if (custom) {
        if (!isValidShortName(custom)) {
          res.status(400).json({
            message: "Names can use letters, numbers and dashes, and must be 3–32 characters long.",
          });
          return;
        }
        if (RESERVED_SHORT_IDS.has(custom)) {
          res.status(400).json({
            message: "That name is used by the site itself. Please choose another.",
          });
          return;
        }
      }

      // A chosen name is tried once; a generated one is retried if it happens to be taken.
      const attempts = custom ? 1 : GENERATE_ATTEMPTS;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        const shortId = custom || generateShortName();
        try {
          const url = await createUrl(pool, { shortId, originalUrl, userId: userId(req), clubId });
          res.status(201).json(url);
          return;
        } catch (err) {
          // The unique constraint on short_id is the source of truth, so concurrent creates are safe.
          if (!isUniqueViolation(err, "urls_short_id_key")) throw err;
        }
      }
      res.status(409).json({
        message: custom
          ? "That name is already taken. Try adding your club's name, like sunrise-zoom."
          : "Couldn't find a free name. Please try again.",
      });
    }),
  );

  // The logged-in user's links and their clubs' links, newest first
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const urls = await listUrls(pool, userId(req));
      res.json(urls);
    }),
  );

  // One link with its stats: clicks per day, QR scans vs typed links, and past destinations
  router.get(
    "/:shortId",
    asyncHandler(async (req, res) => {
      const url = await findUrl(pool, normalizeShortName(req.params.shortId), userId(req));
      if (!url) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      res.json({ ...url, stats: await getUrlStats(pool, url.id) });
    }),
  );

  // Change a link: where it goes (a new Zoom link, keeping the name and posters), its label,
  // which club looks after it, and whether it's on the club page.
  router.patch(
    "/:shortId",
    asyncHandler(async (req, res) => {
      const changes = parseLinkChanges(req.body ?? {});
      if ("error" in changes) {
        res.status(400).json({ message: changes.error });
        return;
      }
      const result = await updateLink(pool, {
        shortId: normalizeShortName(req.params.shortId),
        userId: userId(req),
        changes,
      });
      if (!result.ok) {
        if (result.reason === "not-a-member") res.status(403).json(NOT_A_MEMBER);
        else res.status(404).json({ message: "Not found" });
        return;
      }
      res.json(result.url);
    }),
  );

  // Delete a short URL
  router.delete(
    "/:shortId",
    asyncHandler(async (req, res) => {
      if (!(await deleteUrl(pool, normalizeShortName(req.params.shortId), userId(req)))) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      res.json({ message: "Deleted" });
    }),
  );

  return router;
}
