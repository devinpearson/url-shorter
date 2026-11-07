import { Router } from "express";
import passport from "passport";

const router = Router();

const frontendUrl = (path = "/") => `${process.env.ORIGIN ?? ""}${path}`;

// Start Auth0 login
router.get(
  "/login",
  passport.authenticate("auth0", {
    scope: "openid profile email",
  }),
);

// Auth0 callback
router.get(
  "/callback",
  passport.authenticate("auth0", { failureRedirect: frontendUrl("/login") }),
  (_req, res) => {
    res.redirect(frontendUrl("/")); // Redirect to frontend after login
  },
);

// Logout
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect(frontendUrl("/"));
    });
  });
});

// Get current user. Logged out is a normal state, not an error: answer 200 with null
// so browsers don't log a failed request on every page load.
router.get("/me", (req, res) => {
  if (!req.user) {
    res.json(null);
    return;
  }
  const { _id, displayName, email } = req.user;
  res.json({ _id, displayName, email });
});

export default router;
