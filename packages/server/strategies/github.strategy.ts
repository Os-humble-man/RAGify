import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import type { OAuthProfile } from '../types/OAuthProfile';

passport.use(
   new GitHubStrategy(
      {
         clientID: process.env.GITHUB_CLIENT_ID!,
         clientSecret: process.env.GITHUB_CLIENT_SECRET!,
         callbackURL: `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/github/callback`,
         scope: ['user:email'],
      },
      (
         _accessToken: string,
         _refreshToken: string,
         profile: any,
         done: (err: any, user?: OAuthProfile | false | null) => void
      ) => {
         const email =
            profile.emails && profile.emails.length > 0
               ? profile.emails[0].value
               : `${profile.username}@github.local`;

         const userProfile: OAuthProfile = {
            id: profile.id,
            email,
            name: profile.displayName || profile.username || 'GitHub User',
            avatarUrl: profile.photos?.[0]?.value!,
         };
         done(null, userProfile);
      }
   )
);

export default passport;
