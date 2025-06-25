import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import passport from 'passport';
import session from 'express-session';
import dotenv from 'dotenv';
import './passport'; // Import Passport configuration
import authRoutes from './routes/auth';
import urlRoutes from './routes/url';

// Load environment variables
dotenv.config({ path: __dirname + '/../.env' });

const app = express();

// CORS must be first
app.use(cors({ origin: process.env.ORIGIN, credentials: true }));

// Trust proxy for session/cookie support
app.set('trust proxy', 1);

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false, // set to false for production
  cookie: {
    sameSite: 'lax', // allow cross-site cookies for local dev
    secure: false,   // set to true if using HTTPS
  },
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.get('/api/public', (req, res) => {
  res.json({ message: 'This is a public endpoint and does not require authentication.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes);

// Catch-all for short links (must be after all /api routes)
app.get('/:shortId', async (req, res) => {
  try {
    const Url = require('./models/Url').default;
    const url = await Url.findOneAndUpdate(
      { shortId: req.params.shortId },
      { $inc: { clicks: 1 } },
      { new: true }
    );
    if (url) {
      return res.redirect(url.originalUrl);
    }
    res.status(404).send('Short URL not found');
  } catch {
    res.status(500).send('Server error');
  }
});

const PORT = process.env.PORT || 5001;

mongoose.connect(process.env.MONGO_URI || '', { })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('MongoDB connection error:', err));
