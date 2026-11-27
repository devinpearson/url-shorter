import path from "node:path";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import session from "express-session";
import helmet from "helmet";
import type { Pool } from "pg";
import { isAppPagePath } from "./appPages";
import { findDestination, recordClick } from "./db/urls";
import { escapeHtml, simplePage } from "./html";
import { createPassport } from "./passport";
import { authRouter } from "./routes/auth";
import { clubsRouter, invitesRouter } from "./routes/clubs";
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
  // How the site is written on screen (toast.li): from ORIGIN, so proxies can't change it.
  const configuredHost = options.origin ? new URL(options.origin).host : undefined;
  const siteHost = (req: Request) => configuredHost ?? req.get("host") ?? "";
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
  app.use("/api/clubs", clubsRouter(pool));
  app.use("/api/invites", invitesRouter(pool));
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
      // toast.li/name+ shows where a link goes instead of going there (and isn't counted).
      if (req.params.shortId.endsWith("+")) {
        const name = normalizeShortName(req.params.shortId.slice(0, -1));
        const destination = name ? await findDestination(pool, name) : null;
        if (!destination) {
          res.status(404).type("html").send(NOT_FOUND_PAGE);
          return;
        }
        res.type("html").send(previewPage(`${siteHost(req)}/${name}`, destination));
        return;
      }

      // Names are stored lowercase, so /Club-Roles and /club-roles are the same link.
      // QR codes add ?src=qr, so scans can be told apart from typed and clicked links.
      const source = req.query.src === "qr" ? "qr" : "link";
      const originalUrl = await recordClick(pool, normalizeShortName(req.params.shortId), source);
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
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    // Too late for an error page once the response has started; let Express close it.
    if (res.headersSent) return next(err);
    res.status(500).json({ message: "Server error" });
  });

  return app;
}

/** Shown for a mistyped or deleted short link: plain HTML, so it works without the app. */
const NOT_FOUND_PAGE = simplePage(
  "Link not found",
  `<h1>We couldn't find that link</h1>
  <p>Check the spelling against the poster or message you got it from. Capital letters don't
  matter, but dashes do: <strong>club-roles</strong> is different from <strong>clubroles</strong>.</p>
  <p><a href="/">Go to Club Links</a></p>`,
);

/** toast.li/name+ : where the link goes, so people can check before visiting. */
function previewPage(shortLink: string, destination: string) {
  return simplePage(
    "Where this link goes",
    `<h1>${escapeHtml(shortLink)} goes to</h1>
  <p class="destination">${escapeHtml(destination)}</p>
  <p><a class="button" href="${escapeHtml(destination)}" rel="noreferrer">Continue to this page</a></p>
  <p class="small">Club Links are made by Toastmasters club officers. If this one looks wrong,
  <a href="/contact?topic=report">report it</a>.</p>`,
  );
}
