import { Router, Request, Response, NextFunction } from "express";
import { randomInt } from "crypto";
import rateLimit from "express-rate-limit";
import Url from "../models/Url";
import { ensureAuth } from "../middleware/auth";

const router = Router();

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
  "index.html",
]);

// Express 4 does not catch errors from async handlers; forward them to `next`.
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asyncHandler = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res, next).catch(next);
};

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

function parseHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

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
      const url = await Url.create({ shortId, originalUrl, user: req.user!._id });
      res.status(201).json(url);
    } catch (err) {
      // The unique index on shortId is the source of truth, so concurrent creates are safe.
      if (isDuplicateKeyError(err)) {
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
    const urls = await Url.find({ user: req.user!._id }).sort({ createdAt: -1 });
    res.json(urls);
  }),
);

// Get stats for a short URL
router.get(
  "/:shortId",
  asyncHandler(async (req, res) => {
    const url = await Url.findOne({ shortId: req.params.shortId, user: req.user!._id });
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
    const result = await Url.deleteOne({ shortId: req.params.shortId, user: req.user!._id });
    if (result.deletedCount === 0) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    res.json({ message: "Deleted" });
  }),
);

export default router;
