import { Router } from "express";
import User from "../models/User";

/**
 * Test-only login, mounted by createApp({ enableTestLogin: true }) for the API and
 * end-to-end tests. Logs in a user without going through Auth0.
 */
const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const id = typeof req.body?.id === "string" ? req.body.id : "test|officer";
    const displayName =
      typeof req.body?.displayName === "string" ? req.body.displayName : "Test Officer";
    const email = typeof req.body?.email === "string" ? req.body.email : undefined;

    const user =
      (await User.findOne({ googleId: id })) ??
      (await User.create({ googleId: id, displayName, email }));

    req.login(user, (err) => {
      if (err) return next(err);
      res.json({ _id: user._id, displayName: user.displayName, email: user.email });
    });
  } catch (err) {
    next(err);
  }
});

export default router;
