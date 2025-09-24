const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const { authLimiter, publicLimiter } = require('../rateLimiter');
const { generateTokens } = require('../../utils/tokenUtils');

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

          // Calculate token expiry (Google tokens typically expire in 1 hour)
          const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

          // Find or create user
          let user = await Admin.findOne({ email: email.toLowerCase() });

          if (user) {
            // Update googleId and OAuth tokens if user exists
            if (!user.googleId) {
              user.googleId = id;
            }
            
            // Store OAuth tokens
            if (!user.oauthTokens) {
              user.oauthTokens = {};
            }
            user.oauthTokens.google = {
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
              googleId: id,
              enabled: true,
              role: 'owner',
              oauthTokens: {
                google: {
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
              authType: 'google',
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

  // Google Auth Routes
  app.get('/api/auth/google', authLimiter, passport.authenticate('google', { 
    scope: ['profile', 'email'],
    accessType: 'offline', // Required for refresh tokens
    prompt: 'consent' // Force consent to get refresh token
  }));
  
  app.get(
    '/api/auth/google/callback',
    publicLimiter,
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
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
          authType: 'google',
          // Include OAuth tokens for API calls if needed
          oauthTokens: req.user.oauthTokens?.google || null,
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

  // Google OAuth token refresh endpoint
  app.post('/api/auth/google/refresh-oauth', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const user = await Admin.findById(userId);
      if (!user || !user.oauthTokens?.google?.refreshToken) {
        return res.status(404).json({
          success: false,
          message: 'Google OAuth refresh token not found'
        });
      }

      // Use Google's OAuth2 client to refresh the token
      const { google } = require('googleapis');
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        refresh_token: user.oauthTokens.google.refreshToken
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update stored tokens
      user.oauthTokens.google.accessToken = credentials.access_token;
      if (credentials.refresh_token) {
        user.oauthTokens.google.refreshToken = credentials.refresh_token;
      }
      user.oauthTokens.google.expiresAt = new Date(credentials.expiry_date);
      user.lastTokenRefresh = new Date();
      
      await user.save();

      res.json({
        success: true,
        message: 'Google OAuth token refreshed successfully',
        data: {
          accessToken: credentials.access_token,
          expiresAt: credentials.expiry_date
        }
      });

    } catch (error) {
      console.error('Google OAuth token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh Google OAuth token'
      });
    }
  });
};