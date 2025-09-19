const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const mongoose = require('mongoose');
const { authLimiter, publicLimiter } = require('../rateLimiter');

const Admin = mongoose.model('Admin');
const AdminPassword = mongoose.model('AdminPassword');

module.exports = (app) => {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: '/api/auth/facebook/callback',
        profileFields: ['id', 'email', 'first_name', 'last_name', 'picture'],
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const { id, emails, name, photos } = profile;
          const email = emails ? emails[0].value : `${id}@facebook.com`;

          // Find or create user
          let user = await Admin.findOne({ email: email.toLowerCase() });

          if (user) {
            // Update facebookId if not set
            if (!user.facebookId) {
              user.facebookId = id;
              await user.save();
            }
          } else {
            // Create new user
            const newUser = new Admin({
              email: email.toLowerCase(),
              name: name.givenName,
              surname: name.familyName,
              photo: photos[0]?.value || '',
              facebookId: id,
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
              authType: 'facebook',
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

  // Facebook Auth Routes
  app.get('/api/auth/facebook', authLimiter, passport.authenticate('facebook', { scope: ['email'] }));
  
  app.get(
    '/api/auth/facebook/callback',
    publicLimiter,
    passport.authenticate('facebook', { failureRedirect: '/login?error=facebook_auth_failed' }),
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
        console.error('Facebook OAuth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=facebook_auth_failed`);
      }
    }
  );
};