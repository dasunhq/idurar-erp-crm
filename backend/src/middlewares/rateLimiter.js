const rateLimit = require('express-rate-limit');

// Environment variables with defaults
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW) || 60000; // 1 minute
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX) || 100; // 100 requests per window
const RATE_LIMIT_MAX_SENSITIVE = parseInt(process.env.RATE_LIMIT_MAX_SENSITIVE) || 50; // 50 requests for sensitive endpoints
const RATE_LIMIT_SKIP_SUCCESS = process.env.RATE_LIMIT_SKIP_SUCCESS === 'true' || false; // Skip successful requests in count

// Standard error response for rate limiting
const standardErrorResponse = {
  error: "Too many requests, please try again later."
};

// Global rate limiter for the entire application
const globalRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: RATE_LIMIT_SKIP_SUCCESS,
  message: standardErrorResponse,
  handler: (req, res) => {
    res.status(429).json(standardErrorResponse);
  }
});

// Sensitive endpoints rate limiter (for file system operations, setup, etc.)
const sensitiveRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX_SENSITIVE,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: RATE_LIMIT_SKIP_SUCCESS,
  message: standardErrorResponse,
  handler: (req, res) => {
    res.status(429).json(standardErrorResponse);
  }
});

// Setup endpoint specific rate limiter (very restrictive)
const setupRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: parseInt(process.env.RATE_LIMIT_MAX_SETUP) || 5, // Only 5 setup attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Always count setup attempts
  message: standardErrorResponse,
  handler: (req, res) => {
    res.status(429).json(standardErrorResponse);
  }
});

// File download/upload rate limiter
const fileOperationRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: parseInt(process.env.RATE_LIMIT_MAX_FILE_OPS) || 30, // 30 file operations per minute
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: RATE_LIMIT_SKIP_SUCCESS,
  message: standardErrorResponse,
  handler: (req, res) => {
    res.status(429).json(standardErrorResponse);
  }
});

module.exports = {
  globalRateLimiter,
  sensitiveRateLimiter,
  setupRateLimiter,
  fileOperationRateLimiter,
  standardErrorResponse
};