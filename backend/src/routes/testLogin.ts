import { Router } from "express";
import type { Pool } from "pg";
import { findOrCreateUser } from "../db/users";

/**
 * Test-only login, mounted by createApp({ enableTestLogin: true }) for the API and
 * end-to-end tests. Logs in a user without going through Auth0.
 */
export function testLoginRouter(pool: Pool) {
  const router = Router();

  router.post("/login", async (req, res, next) => {
    try {
      const str = (value: unknown) => (typeof value === "string" ? value : undefined);
      const user = await findOrCreateUser(pool, {
        auth0Id: str(req.body?.id) ?? "test|officer",
        displayName: str(req.body?.displayName) ?? "Test Officer",
        email: str(req.body?.email),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.json({ id: user.id, displayName: user.displayName, email: user.email });
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
