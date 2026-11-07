import dotenv from 'dotenv';

// Imported first by index.ts so variables are set before other modules (e.g. passport.ts) read them.
dotenv.config({ path: __dirname + '/../.env' });
