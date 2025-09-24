const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const mongoose = require('mongoose');
const { authLimiter, publicLimiter } = require('../rateLimiter');
const { generateTokens } = require('../../utils/tokenUtils');

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

          // Calculate token expiry (Facebook tokens typically expire in 60 days if long-lived)
          const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

          // Find or create user
          let user = await Admin.findOne({ email: email.toLowerCase() });

          if (user) {
            // Update facebookId and OAuth tokens if user exists
            if (!user.facebookId) {
              user.facebookId = id;
            }
            
            // Store OAuth tokens
            if (!user.oauthTokens) {
              user.oauthTokens = {};
            }
            user.oauthTokens.facebook = {
              accessToken: accessToken,
              refreshToken: refreshToken,
              expiresAt: tokenExpiresAt,
            };
            user.lastTokenRefresh = new Date();
            
            await user.save();
          } else {
            // Create new user with OAuth tokens
            const newUser = new Admin({
              email: email.toLowerCase(),
              name: name.givenName,
              surname: name.familyName,
              photo: photos[0]?.value || '',
              facebookId: id,
              enabled: true,
              role: 'owner',
              oauthTokens: {
                facebook: {
                  accessToken: accessToken,
                  refreshToken: refreshToken,
                  expiresAt: tokenExpiresAt,
                }
              },
              lastTokenRefresh: new Date(),
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
              tokenExpiresAt: tokenExpiresAt,
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
        // Generate a standard JWT token compatible with existing auth system
        const jwt = require('jsonwebtoken');
        const standardToken = jwt.sign(
          { id: req.user._id },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Generate enhanced access and refresh tokens for new features
        const tokens = generateTokens(req.user);
        
        // Update logged sessions with the standard token (for compatibility)
        // and refresh tokens for enhanced functionality
        const userPassword = await AdminPassword.findOneAndUpdate(
          { user: req.user._id },
          { 
            $push: { 
              loggedSessions: standardToken,  // Compatible with existing auth
              refreshTokens: tokens.refreshToken
            },
            tokenExpiresAt: new Date(Date.now() + tokens.refreshTokenExpiresIn)
          },
          { new: true }
        ).exec();

        // Clean up old expired sessions/tokens (keep only last 5)
        if (userPassword.loggedSessions.length > 5) {
          userPassword.loggedSessions = userPassword.loggedSessions.slice(-5);
        }
        if (userPassword.refreshTokens.length > 5) {
          userPassword.refreshTokens = userPassword.refreshTokens.slice(-5);
        }
        await userPassword.save();
        
        // Prepare user data for frontend
        const userData = {
          _id: req.user._id,
          name: req.user.name,
          surname: req.user.surname,
          role: req.user.role,
          email: req.user.email,
          photo: req.user.photo,
          // Use standard token for immediate compatibility
          token: standardToken,
          // Also provide enhanced tokens for future use
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessTokenExpiresIn: tokens.accessTokenExpiresIn,
          refreshTokenExpiresIn: tokens.refreshTokenExpiresIn,
          authType: 'facebook',
          // Include OAuth tokens for API calls if needed
          oauthTokens: req.user.oauthTokens?.facebook || null,
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

  // Facebook OAuth token refresh endpoint
  app.post('/api/auth/facebook/refresh-oauth', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const user = await Admin.findById(userId);
      if (!user || !user.oauthTokens?.facebook?.accessToken) {
        return res.status(404).json({
          success: false,
          message: 'Facebook OAuth access token not found'
        });
      }

      // Facebook token refresh using Graph API
      const axios = require('axios');
      
      try {
        const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            fb_exchange_token: user.oauthTokens.facebook.accessToken
          }
        });

        const { access_token, expires_in } = response.data;
        
        // Update stored tokens
        user.oauthTokens.facebook.accessToken = access_token;
        user.oauthTokens.facebook.expiresAt = new Date(Date.now() + (expires_in * 1000));
        user.lastTokenRefresh = new Date();
        
        await user.save();

        res.json({
          success: true,
          message: 'Facebook OAuth token refreshed successfully',
          data: {
            accessToken: access_token,
            expiresAt: user.oauthTokens.facebook.expiresAt
          }
        });

      } catch (apiError) {
        console.error('Facebook API error:', apiError.response?.data || apiError.message);
        res.status(400).json({
          success: false,
          message: 'Failed to refresh Facebook token via API'
        });
      }

    } catch (error) {
      console.error('Facebook OAuth token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh Facebook OAuth token'
      });
    }
  });
};