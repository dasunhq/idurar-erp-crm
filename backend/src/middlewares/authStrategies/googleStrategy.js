const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const { authLimiter, publicLimiter } = require('../rateLimiter');

const Admin = mongoose.model('Admin');
const AdminPassword = mongoose.model('AdminPassword');

module.exports = (app) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const { id, emails, name, photos } = profile;
          const email = emails[0].value;

          // Find or create user
          let user = await Admin.findOne({ email: email.toLowerCase() });

          if (user) {
            // Update googleId if not set
            if (!user.googleId) {
              user.googleId = id;
              await user.save();
            }
          } else {
            // Create new user
            const newUser = new Admin({
              email: email.toLowerCase(),
              name: name.givenName,
              surname: name.familyName,
              photo: photos[0]?.value || '',
              googleId: id,
              enabled: true,
              role: 'owner',
            });

            user = await newUser.save();

            // Create password record
            const salt = require('shortid').generate();
            const hashedPassword = require('bcryptjs').hashSync(salt + 'oauth_temp_password');
            
            const userPassword = new AdminPassword({
              user: user._id,
              password: hashedPassword,
              salt: salt,
              emailVerified: true,
              authType: 'google',
            });
            
            await userPassword.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  // Google Auth Routes
  app.get('/api/auth/google', authLimiter, passport.authenticate('google', { scope: ['profile', 'email'] }));
  
  app.get(
    '/api/auth/google/callback',
    publicLimiter,
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
    async (req, res) => {
      try {
        // Generate JWT token
        const token = require('jsonwebtoken').sign(
          { id: req.user._id },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        // Update logged sessions
        await AdminPassword.findOneAndUpdate(
          { user: req.user._id },
          { $push: { loggedSessions: token } },
          { new: true }
        ).exec();
        
        // Prepare user data for frontend
        const userData = {
          _id: req.user._id,
          name: req.user.name,
          surname: req.user.surname,
          role: req.user.role,
          email: req.user.email,
          photo: req.user.photo,
          token: token,
        };
        
        // Redirect to frontend with encoded user data
        const encodedData = encodeURIComponent(JSON.stringify(userData));
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?data=${encodedData}`);
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
      }
    }
  );
};