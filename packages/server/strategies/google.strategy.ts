import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { OAuthProfile } from '../types/OAuthProfile';

passport.use(
   new GoogleStrategy(
      {
         clientID: process.env.GOOGLE_CLIENT_ID!,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
         callbackURL: `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`,
      },
      (_accessToken, _refreshToken, profile, done) => {
         const userProfile: OAuthProfile = {
            id: profile.id,
            email: profile?.emails?.[0]?.value!,
            name: profile?.displayName!,
            avatarUrl: profile?.photos?.[0]?.value!,
         };
         done(null, userProfile);
      }
   )
);

export default passport;
