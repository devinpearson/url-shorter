import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import session from "express-session";
import helmet from "helmet";
import type { Pool } from "pg";
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

  app.use("/api/auth", authRouter(passport));
  app.use("/api/urls", urlRouter(pool));
  app.use("/api/contact", contactRouter(pool));
  if (options.enableTestLogin) app.use("/api/test", testLoginRouter(pool));

  // Catch-all for short links (must be after all /api routes)
  app.get("/:shortId", async (req, res) => {
    try {
      // Names are stored lowercase, so /Club-Roles and /club-roles are the same link.
      const originalUrl = await recordClick(pool, normalizeShortName(req.params.shortId));
      if (originalUrl) {
        res.redirect(originalUrl);
        return;
      }
      res.status(404).send("Short URL not found");
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  });

  // Express treats a middleware as an error handler only when it takes four arguments.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  });

  return app;
}
