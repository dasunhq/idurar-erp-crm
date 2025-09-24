const express = require('express');
const mongoose = require('mongoose');
const { refreshAccessToken, verifyToken } = require('../utils/tokenUtils');

const Admin = mongoose.model('Admin');
const AdminPassword = mongoose.model('AdminPassword');

const router = express.Router();

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify and decode refresh token
    const refreshResult = refreshAccessToken(refreshToken);

    if (!refreshResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Check if refresh token exists in database
    const userPassword = await AdminPassword.findOne({
      user: refreshResult.user.id,
      refreshTokens: refreshToken
    });

    if (!userPassword) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found or revoked'
      });
    }

    // Get user details
    const user = await Admin.findById(refreshResult.user.id);
    if (!user || !user.enabled || user.removed) {
      return res.status(401).json({
        success: false,
        message: 'User account is disabled or removed'
      });
    }

    // Add new access token to logged sessions
    await AdminPassword.findOneAndUpdate(
      { user: user._id },
      { $push: { loggedSessions: refreshResult.accessToken } }
    );

    res.json({
      success: true,
      message: 'Access token refreshed successfully',
      data: {
        accessToken: refreshResult.accessToken,
        accessTokenExpiresIn: refreshResult.accessTokenExpiresIn,
        user: {
          _id: user._id,
          name: user.name,
          surname: user.surname,
          email: user.email,
          role: user.role,
          photo: user.photo
        }
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token refresh'
    });
  }
});

/**
 * Revoke refresh token (logout)
 * POST /api/auth/revoke
 */
router.post('/revoke', async (req, res) => {
  try {
    const { refreshToken, accessToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Decode token to get user ID (don't verify as it might be expired)
    let userId;
    try {
      const decoded = verifyToken(refreshToken, true);
      userId = decoded.id;
    } catch (error) {
      // Token might be expired, try to extract user ID without verification
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(refreshToken);
      userId = decoded?.id;
    }

    if (userId) {
      // Remove tokens from database
      await AdminPassword.findOneAndUpdate(
        { user: userId },
        { 
          $pull: { 
            refreshTokens: refreshToken,
            loggedSessions: accessToken
          }
        }
      );
    }

    res.json({
      success: true,
      message: 'Token revoked successfully'
    });

  } catch (error) {
    console.error('Token revocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token revocation'
    });
  }
});

/**
 * Revoke all refresh tokens (logout from all devices)
 * POST /api/auth/revoke-all
 */
router.post('/revoke-all', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token to get user ID
    const decoded = verifyToken(refreshToken, true);

    // Clear all tokens for the user
    await AdminPassword.findOneAndUpdate(
      { user: decoded.id },
      { 
        $set: { 
          refreshTokens: [],
          loggedSessions: []
        }
      }
    );

    res.json({
      success: true,
      message: 'All tokens revoked successfully'
    });

  } catch (error) {
    console.error('Token revocation error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

/**
 * Check token status
 * POST /api/auth/verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify access token
    const decoded = verifyToken(accessToken);

    // Check if token exists in database
    const userPassword = await AdminPassword.findOne({
      user: decoded.id,
      loggedSessions: accessToken
    });

    if (!userPassword) {
      return res.status(401).json({
        success: false,
        message: 'Token not found or revoked'
      });
    }

    // Get user details
    const user = await Admin.findById(decoded.id);
    if (!user || !user.enabled || user.removed) {
      return res.status(401).json({
        success: false,
        message: 'User account is disabled or removed'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          surname: user.surname,
          email: user.email,
          role: user.role,
          photo: user.photo
        },
        expiresAt: decoded.exp * 1000 // Convert to milliseconds
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired access token'
    });
  }
});

module.exports = router;