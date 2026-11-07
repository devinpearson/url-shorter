import { type NextFunction, type Request, type Response, Router } from "express";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import { APP_PAGES } from "../appPages";
import { isUniqueViolation } from "../db/pool";
import {
  createUrl,
  deleteUrl,
  findUrl,
  getUrlStats,
  listUrls,
  updateDestination,
} from "../db/urls";
import { ensureAuth } from "../middleware/auth";
import { generateShortName, isValidShortName, normalizeShortName } from "../shortNames";

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

// Express 4 does not catch errors from async handlers; forward them to `next`.
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asyncHandler = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res, next).catch(next);
};

function parseHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The logged-in user's id. Every route below runs after ensureAuth, so req.user is set. */
function userId(req: Request) {
  if (!req.user) throw new Error("ensureAuth must run before this route");
  return req.user.id;
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
        res.status(400).json({ message: "Please enter a valid http:// or https:// URL." });
        return;
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
          const url = await createUrl(pool, { shortId, originalUrl, userId: userId(req) });
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

  // Get all URLs for the logged-in user, newest first
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

  // Point a link somewhere new (a new Zoom link) without changing its name or the poster
  router.patch(
    "/:shortId",
    asyncHandler(async (req, res) => {
      const originalUrl = parseHttpUrl(req.body?.originalUrl);
      if (!originalUrl) {
        res.status(400).json({ message: "Please enter a valid http:// or https:// URL." });
        return;
      }
      const url = await updateDestination(pool, {
        shortId: normalizeShortName(req.params.shortId),
        userId: userId(req),
        originalUrl,
      });
      if (!url) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      res.json(url);
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
