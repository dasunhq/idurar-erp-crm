const express = require('express');
const mongoose = require('mongoose');

const Admin = mongoose.model('Admin');
const AdminPassword = mongoose.model('AdminPassword');

const router = express.Router();

/**
 * Debug endpoint to check user session status
 * GET /api/debug/auth-status
 */
router.get('/auth-status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.json({
        status: 'no_token',
        message: 'No authorization token provided',
        hasToken: false
      });
    }

    // Try to decode token without verification first
    const jwt = require('jsonwebtoken');
    let decoded;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      try {
        decoded = jwt.decode(token);
        return res.json({
          status: 'token_invalid',
          message: 'Token verification failed',
          error: error.message,
          decodedPayload: decoded,
          hasToken: true
        });
      } catch (decodeError) {
        return res.json({
          status: 'token_malformed',
          message: 'Token is malformed',
          error: decodeError.message,
          hasToken: true
        });
      }
    }

    // Check user exists
    const user = await Admin.findById(decoded.id);
    if (!user) {
      return res.json({
        status: 'user_not_found',
        message: 'User does not exist',
        userId: decoded.id,
        hasToken: true
      });
    }

    // Check user password record
    const userPassword = await AdminPassword.findOne({ user: decoded.id });
    if (!userPassword) {
      return res.json({
        status: 'password_record_not_found',
        message: 'User password record not found',
        user: {
          id: user._id,
          email: user.email,
          enabled: user.enabled,
          removed: user.removed
        },
        hasToken: true
      });
    }

    // Check if token is in logged sessions
    const isTokenInSessions = userPassword.loggedSessions.includes(token);
    
    res.json({
      status: 'success',
      message: 'Token analysis complete',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        role: user.role,
        enabled: user.enabled,
        removed: user.removed,
        googleId: user.googleId || null,
        facebookId: user.facebookId || null
      },
      tokenInfo: {
        isValid: true,
        isInSessions: isTokenInSessions,
        expiresAt: new Date(decoded.exp * 1000),
        issuedAt: new Date(decoded.iat * 1000),
        userId: decoded.id
      },
      sessionInfo: {
        totalSessions: userPassword.loggedSessions.length,
        totalRefreshTokens: userPassword.refreshTokens?.length || 0,
        authType: userPassword.authType,
        emailVerified: userPassword.emailVerified
      },
      hasToken: true
    });

  } catch (error) {
    console.error('Auth status debug error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message,
      hasToken: !!req.headers.authorization
    });
  }
});

/**
 * Debug endpoint to list user sessions
 * GET /api/debug/sessions/:userId
 */
router.get('/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const userPassword = await AdminPassword.findOne({ 
      user: new mongoose.Types.ObjectId(userId) 
    });

    if (!userPassword) {
      return res.status(404).json({
        success: false,
        message: 'User password record not found'
      });
    }

    const jwt = require('jsonwebtoken');
    const sessions = userPassword.loggedSessions.map((token, index) => {
      try {
        const decoded = jwt.decode(token);
        return {
          index,
          token: token.substring(0, 20) + '...',
          issuedAt: decoded ? new Date(decoded.iat * 1000) : null,
          expiresAt: decoded ? new Date(decoded.exp * 1000) : null,
          isExpired: decoded ? Date.now() > (decoded.exp * 1000) : true,
          userId: decoded?.id
        };
      } catch (error) {
        return {
          index,
          token: 'malformed',
          error: error.message
        };
      }
    });

    res.json({
      success: true,
      userId,
      totalSessions: userPassword.loggedSessions.length,
      sessions
    });

  } catch (error) {
    console.error('Sessions debug error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;