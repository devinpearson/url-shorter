import './env'; // must stay first: loads .env before other modules read process.env
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import passport from 'passport';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import './passport'; // Import Passport configuration
import authRoutes from './routes/auth';
import urlRoutes from './routes/url';
import contactRoutes from './routes/contact';
import Url from './models/Url';

const { MONGO_URI, SESSION_SECRET } = process.env;
if (!MONGO_URI) throw new Error('MONGO_URI must be set');
if (!SESSION_SECRET) throw new Error('SESSION_SECRET must be set');

const isProduction = process.env.NODE_ENV === 'production';

const app = express();

// CORS must be first
app.use(cors({ origin: process.env.ORIGIN, credentials: true }));
app.use(helmet());

// Trust the first proxy (nginx) so secure cookies and client IPs work behind it
app.set('trust proxy', 1);

app.use(express.json({ limit: '10kb' }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI, ttl: 14 * 24 * 60 * 60 }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction, // requires HTTPS (or a proxy setting X-Forwarded-Proto) in production
    maxAge: 14 * 24 * 60 * 60 * 1000,
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
app.use('/api/contact', contactRoutes);

// Catch-all for short links (must be after all /api routes)
app.get('/:shortId', async (req, res) => {
  try {
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express needs 4 args to treat this as an error handler
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5001;

mongoose.connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
