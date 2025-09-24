const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate access token (JWT)
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (default: 15m)
 * @returns {string} - JWT access token
 */
const generateAccessToken = (payload, expiresIn = '15m') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (default: 7d)
 * @returns {string} - JWT refresh token
 */
const generateRefreshToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn });
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} - Object containing access and refresh tokens with expiry times
 */
const generateTokens = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: 15 * 60 * 1000, // 15 minutes in milliseconds
    refreshTokenExpiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {boolean} isRefreshToken - Whether this is a refresh token
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token, isRefreshToken = false) => {
  const secret = isRefreshToken ? 
    (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) : 
    process.env.JWT_SECRET;
  
  return jwt.verify(token, secret);
};

/**
 * Generate a secure random token for OAuth state or other purposes
 * @param {number} length - Length of the token (default: 32)
 * @returns {string} - Random token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Valid refresh token
 * @returns {Object} - New access token and user info
 */
const refreshAccessToken = (refreshToken) => {
  try {
    const decoded = verifyToken(refreshToken, true);
    const payload = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    const accessToken = generateAccessToken(payload);
    
    return {
      success: true,
      accessToken,
      accessTokenExpiresIn: 15 * 60 * 1000,
      user: payload
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  generateSecureToken,
  refreshAccessToken
};