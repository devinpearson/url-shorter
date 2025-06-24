import passport from 'passport';
import { Strategy as Auth0Strategy } from 'passport-auth0';
import User, { IUser } from './models/User';

passport.serializeUser((user: any, done) => {
  done(null, user._id as string);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id).exec();
    done(null, user as IUser | null);
  } catch (err) {
    done(err, undefined);
  }
});

passport.use(
  new Auth0Strategy(
    {
      domain: process.env.AUTH0_DOMAIN || '',
      clientID: process.env.AUTH0_CLIENT_ID || '',
      clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
      callbackURL: process.env.AUTH0_CALLBACK_URL || '',
    },
    async (accessToken, refreshToken, extraParams, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0].value || '',
          });
        }
        return done(null, user as IUser);
      } catch (err) {
        return done(err, undefined);
      }
    }
  )
);
