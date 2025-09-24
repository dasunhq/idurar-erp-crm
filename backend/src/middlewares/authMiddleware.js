const mongoose = require('mongoose');
const { verifyToken } = require('../utils/tokenUtils');

const Admin = mongoose.model('Admin');
const AdminPassword = mongoose.model('AdminPassword');

/**
 * Enhanced authentication middleware with refresh token support
 * Compatible with existing authentication system
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        code: 'TOKEN_REQUIRED',
        jwtExpired: true
      });
    }

    // First try to verify with standard JWT (for backward compatibility)
    let decoded;
    let isEnhancedToken = false;
    
    try {
      // Try standard JWT verification first
      decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    } catch (standardError) {
      try {
        // If standard fails, try enhanced token verification
        decoded = verifyToken(token);
        isEnhancedToken = true;
      } catch (enhancedError) {
        if (standardError.name === 'TokenExpiredError' || enhancedError.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Access token has expired',
            code: 'TOKEN_EXPIRED',
            jwtExpired: true
          });
        } else {
          return res.status(401).json({
            success: false,
            message: 'Invalid access token',
            code: 'TOKEN_INVALID',
            jwtExpired: true
          });
        }
      }
    }

    // Validate user ID format
    if (!require('mongoose').Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user ID format in token',
        code: 'TOKEN_INVALID',
        jwtExpired: true
      });
    }

    // Check if token exists in database (not revoked)
    const userId = new require('mongoose').Types.ObjectId(decoded.id);
    const userPassword = await AdminPassword.findOne({
      user: userId,
      removed: false,
      loggedSessions: token
    });

    if (!userPassword) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked or user session not found',
        code: 'TOKEN_REVOKED',
        jwtExpired: true
      });
    }

    // Get user details
    const user = await Admin.findOne({ 
      _id: userId, 
      removed: false 
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        jwtExpired: true
      });
    }

    if (!user.enabled) {
      return res.status(401).json({
        success: false,
        message: 'User account is disabled',
        code: 'USER_DISABLED',
        jwtExpired: true
      });
    }

    // Attach user to request object (compatible with existing system)
    req.admin = user; // For compatibility with existing adminAuth system
    req.user = user;  // For new enhanced system
    req.token = token;
    req.userPassword = userPassword;
    req.isEnhancedToken = isEnhancedToken;

    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      code: 'INTERNAL_ERROR',
      jwtExpired: true
    });
  }
};

/**
 * Role-based authorization middleware
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await Admin.findById(decoded.id);
        
        if (user && user.enabled && !user.removed) {
          const userPassword = await AdminPassword.findOne({
            user: decoded.id,
            loggedSessions: token
          });

          if (userPassword) {
            req.user = user;
            req.token = token;
            req.userPassword = userPassword;
          }
        }
      } catch (error) {
        // Ignore token errors in optional auth
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without authentication
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};