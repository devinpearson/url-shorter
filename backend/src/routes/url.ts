import { randomInt } from "node:crypto";
import { type NextFunction, type Request, type Response, Router } from "express";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import { isUniqueViolation } from "../db/pool";
import { createUrl, deleteUrl, findUrl, listUrls } from "../db/urls";
import { ensureAuth } from "../middleware/auth";

// Uses Node's crypto directly: nanoid v5 is ESM-only and this backend compiles to CommonJS.
const ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const generateShortId = (length = 8) =>
  Array.from({ length }, () => ALPHANUM[randomInt(ALPHANUM.length)]).join("");

const SHORT_ID_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
// Paths used by the frontend or API that a custom short ID must not shadow.
const RESERVED_SHORT_IDS = new Set([
  "api",
  "login",
  "logout",
  "stats",
  "dashboard",
  "assets",
  "static",
  "about",
  "contact",
  "terms",
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

      const custom = req.body?.customShortId;
      let shortId: string;
      if (typeof custom === "string" && custom.trim()) {
        shortId = custom.trim();
        if (!SHORT_ID_PATTERN.test(shortId)) {
          res.status(400).json({
            message: 'Short IDs must be 3–32 characters: letters, numbers, "_" or "-".',
          });
          return;
        }
        if (RESERVED_SHORT_IDS.has(shortId.toLowerCase())) {
          res.status(400).json({ message: "That short ID is reserved. Please choose another." });
          return;
        }
      } else {
        shortId = generateShortId();
      }

      try {
        const url = await createUrl(pool, { shortId, originalUrl, userId: userId(req) });
        res.status(201).json(url);
      } catch (err) {
        // The unique constraint on short_id is the source of truth, so concurrent creates are safe.
        if (isUniqueViolation(err, "urls_short_id_key")) {
          res.status(409).json({ message: "Short ID already in use." });
          return;
        }
        throw err;
      }
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

  // Get stats for a short URL
  router.get(
    "/:shortId",
    asyncHandler(async (req, res) => {
      const url = await findUrl(pool, req.params.shortId, userId(req));
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
      if (!(await deleteUrl(pool, req.params.shortId, userId(req)))) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      res.json({ message: "Deleted" });
    }),
  );

  return router;
}
