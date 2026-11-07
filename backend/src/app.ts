import path from "node:path";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import session from "express-session";
import helmet from "helmet";
import type { Pool } from "pg";
import { isAppPagePath } from "./appPages";
import { recordClick } from "./db/urls";
import { createPassport } from "./passport";
import { authRouter } from "./routes/auth";
import { contactRouter } from "./routes/contact";
import { testLoginRouter } from "./routes/testLogin";
import { urlRouter } from "./routes/url";
import { normalizeShortName } from "./shortNames";

const PgSessionStore = connectPgSimple(session);

export interface AppOptions {
  /** Postgres pool for data and sessions; the caller runs migrations and closes it. */
  pool: Pool;
  sessionSecret: string;
  origin?: string;
  /** Send the session cookie only over HTTPS. */
  secureCookies?: boolean;
  /**
   * The built frontend (dist/). When set, the app serves it too: static files, and index.html
   * for the app's pages. Production runs this way, in one container behind nginx; in
   * development Vite serves the frontend instead.
   */
  staticDir?: string;
  /**
   * Adds POST /api/test/login so automated tests can log in without Auth0.
   * Only for the test servers in tests/; refused when NODE_ENV is production.
   */
  enableTestLogin?: boolean;
}

/** Builds the Express app without opening a port, so tests can use it. */
export function createApp(options: AppOptions) {
  if (options.enableTestLogin && process.env.NODE_ENV === "production") {
    throw new Error("Test login must never be enabled in production");
  }
  const { pool } = options;
  const passport = createPassport(pool);

  const app = express();

  // CORS must be first
  app.use(cors({ origin: options.origin, credentials: true }));
  app.use(helmet());

  // Trust the first proxy (nginx) so secure cookies and client IPs work behind it
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "10kb" }));
  app.use(
    session({
      secret: options.sessionSecret,
      resave: false,
      saveUninitialized: false,
      // The session table is created by backend/migrations, not at runtime.
      store: new PgSessionStore({ pool, tableName: "session", ttl: 14 * 24 * 60 * 60 }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        // Requires HTTPS, or a proxy setting X-Forwarded-Proto, when on.
        secure: options.secureCookies ?? false,
        maxAge: 14 * 24 * 60 * 60 * 1000,
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/api/ping", (_req, res) => {
    res.json({ message: "pong" });
  });

  // For Docker's health check and the server's monitoring: up only if the database answers.
  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok" });
    } catch (err) {
      console.error("Health check failed:", err);
      res.status(503).json({ status: "unavailable" });
    }
  });

  app.use("/api/auth", authRouter(passport));
  app.use("/api/urls", urlRouter(pool));
  app.use("/api/contact", contactRouter(pool));
  if (options.enableTestLogin) app.use("/api/test", testLoginRouter(pool));
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  const { staticDir } = options;
  const indexHtml = staticDir ? path.join(staticDir, "index.html") : undefined;
  if (staticDir && indexHtml) {
    // Built assets have content hashes in their names, so they can be cached for a year.
    app.use(
      "/assets",
      express.static(path.join(staticDir, "assets"), { immutable: true, maxAge: "1y" }),
    );
    // favicon.svg, robots.txt, sitemap.xml, portrait.png…
    app.use(express.static(staticDir, { index: false }));
    // The app's pages; the browser must always check for a newer index.html.
    app.get("*", (req, res, next) => {
      if (!isAppPagePath(req.path)) return next();
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(indexHtml);
    });
  }

  // Short links: one path segment that isn't an app page (must be after all /api routes)
  app.get("/:shortId", async (req, res) => {
    try {
      // Names are stored lowercase, so /Club-Roles and /club-roles are the same link.
      const originalUrl = await recordClick(pool, normalizeShortName(req.params.shortId));
      if (originalUrl) {
        res.redirect(originalUrl);
        return;
      }
      res.status(404).type("html").send(NOT_FOUND_PAGE);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  });

  // Anything else, e.g. /some/deeper/path: the app (which sends unknown pages home), or 404.
  app.use((req, res) => {
    if (indexHtml && req.method === "GET") {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(indexHtml);
      return;
    }
    res.status(404).type("html").send(NOT_FOUND_PAGE);
  });

  // Express treats a middleware as an error handler only when it takes four arguments.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  });

  return app;
}

/** Shown for a mistyped or deleted short link: plain HTML, so it works without the app. */
const NOT_FOUND_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link not found – Club Links</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: grid;
         place-items: center; background: #fff; color: #1f2937; padding: 1.5rem; }
  main { max-width: 32rem; text-align: center; }
  h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
  p { color: #4b5563; line-height: 1.6; }
  a { color: #4f46e5; font-weight: 600; }
</style>
</head>
<body>
<main>
  <h1>We couldn't find that link</h1>
  <p>Check the spelling against the poster or message you got it from. Capital letters don't
  matter, but dashes do: <strong>club-roles</strong> is different from <strong>clubroles</strong>.</p>
  <p><a href="/">Go to Club Links</a></p>
</main>
</body>
</html>`;
