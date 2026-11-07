import { Passport } from "passport";
import { Strategy as Auth0Strategy } from "passport-auth0";
import type { Pool } from "pg";
import { findOrCreateUser, findUserById } from "./db/users";

/**
 * A Passport instance for one app: Auth0 login, with users stored in Postgres and only
 * the user id kept in the session. A separate instance per app keeps tests independent.
 */
export function createPassport(pool: Pool) {
  const passport = new Passport();

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      // A user deleted since logging in is simply logged out.
      done(null, (await findUserById(pool, id)) ?? false);
    } catch (err) {
      done(err);
    }
  });

  passport.use(
    new Auth0Strategy(
      {
        domain: process.env.AUTH0_DOMAIN || "",
        clientID: process.env.AUTH0_CLIENT_ID || "",
        clientSecret: process.env.AUTH0_CLIENT_SECRET || "",
        callbackURL: process.env.AUTH0_CALLBACK_URL || "",
      },
      async (_accessToken, _refreshToken, _extraParams, profile, done) => {
        try {
          const user = await findOrCreateUser(pool, {
            auth0Id: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value,
          });
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );

  return passport;
}
