import MongoStore from "connect-mongo";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import session from "express-session";
import helmet from "helmet";
import mongoose from "mongoose";
import passport from "passport";
import "./passport"; // Passport strategy and session (de)serialisation
import Url from "./models/Url";
import authRoutes from "./routes/auth";
import { contactRouter } from "./routes/contact";
import testLoginRoutes from "./routes/testLogin";
import { urlRouter } from "./routes/url";

export interface AppOptions {
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

/**
 * Builds the Express app without opening a port, so tests can use it. Sessions are stored
 * through Mongoose's connection, which the caller opens with mongoose.connect().
 */
export function createApp(options: AppOptions) {
  if (options.enableTestLogin && process.env.NODE_ENV === "production") {
    throw new Error("Test login must never be enabled in production");
  }

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
      store: MongoStore.create({
        // Reuse Mongoose's connection pool instead of opening a second one.
        clientPromise: mongoose.connection.asPromise().then((conn) => conn.getClient()),
        ttl: 14 * 24 * 60 * 60,
      }),
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

  app.use("/api/auth", authRoutes);
  app.use("/api/urls", urlRouter());
  app.use("/api/contact", contactRouter());
  if (options.enableTestLogin) app.use("/api/test", testLoginRoutes);

  // Catch-all for short links (must be after all /api routes)
  app.get("/:shortId", async (req, res) => {
    try {
      const url = await Url.findOneAndUpdate(
        { shortId: req.params.shortId },
        { $inc: { clicks: 1 } },
        { new: true },
      );
      if (url) {
        res.redirect(url.originalUrl);
        return;
      }
      res.status(404).send("Short URL not found");
    } catch {
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
