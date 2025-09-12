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


module.exports = {
  apiLimiter,

};