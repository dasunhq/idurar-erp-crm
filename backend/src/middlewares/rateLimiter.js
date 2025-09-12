const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter - applies to all API routes
 * Prevents DOS attacks by limiting requests per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    result: null,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests (only count failed or high-rate requests)
  skipSuccessfulRequests: false,
});

/**
 * Strict rate limiter for authentication routes
 * Prevents brute force attacks on login/register endpoints
 */
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes , 1 min for testng
  max: 5, // Limit each IP to 5 login/register requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful login attempts
  message: {
    success: false,
    result: null,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});


module.exports = {
  apiLimiter,
  authLimiter,
};