import { Router } from 'express';
import Url from '../models/Url';
import { ensureAuth } from '../middleware/auth';
import shortid from 'shortid';

const router = Router();

// Create a short URL
router.post('/', ensureAuth, async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const { originalUrl } = req.body;
  const shortId = shortid.generate();
  const url = await Url.create({
    shortId,
    originalUrl,
    user: req.user._id,
  });
  res.json(url);
});

// Get all URLs for the logged-in user
router.get('/', ensureAuth, async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const urls = await Url.find({ user: req.user._id });
  res.json(urls);
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
});

// Delete a short URL
router.delete('/:shortId', ensureAuth, async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  await Url.deleteOne({ shortId: req.params.shortId, user: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
