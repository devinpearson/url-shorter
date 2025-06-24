import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Start Auth0 login
router.get('/login', passport.authenticate('auth0', {
  scope: 'openid profile email',
}));

// Auth0 callback
router.get('/callback',
  passport.authenticate('auth0', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('http://localhost:5173/'); // Redirect to frontend after login
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// Get current user
router.get('/me', (req, res) => {
  res.json(req.user);
});

export default router;
