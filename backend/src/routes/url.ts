import { Router } from 'express';
import Url from '../models/Url';
import { ensureAuth } from '../middleware/auth';

const router = Router();

// Create a short URL
router.post('/', ensureAuth, async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const { originalUrl, customShortId } = req.body;
  let shortId = customShortId && customShortId.trim() ? customShortId.trim() : undefined;

  if (!shortId) {
    // Dynamically import nanoid for CommonJS compatibility
    const { customAlphabet } = await import('nanoid');
    const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const nanoid = customAlphabet(ALPHANUM, 8);
    shortId = nanoid();
  }

  // Check for duplicate shortId
  const existing = await Url.findOne({ shortId });
  if (existing) {
    res.status(409).json({ message: 'Short ID already in use.' });
    return;
  }

  const url = await Url.create({
    shortId,
    originalUrl,
    user: req.user._id,
  });
  res.json(url);
  return;
});

// Get all URLs for the logged-in user
router.get('/', ensureAuth, async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const urls = await Url.find({ user: req.user._id });
  res.json(urls);
  return;
});

// Get stats for a short URL
router.get('/:shortId', ensureAuth, async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const url = await Url.findOne({ shortId: req.params.shortId, user: req.user._id });
  if (!url) {
    res.status(404).json({ message: 'Not found' });
    return;
  }
  res.json(url);
  return;
});

// Delete a short URL
router.delete('/:shortId', ensureAuth, async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  await Url.deleteOne({ shortId: req.params.shortId, user: req.user._id });
  res.json({ message: 'Deleted' });
  return;
});

export default router;
