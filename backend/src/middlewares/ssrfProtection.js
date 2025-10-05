const { URL } = require('url');

/**
 * SSRF Protection Middleware
 * Prevents Server-Side Request Forgery attacks by validating URLs and domains
 */

// Whitelist of allowed domains for external requests
const ALLOWED_DOMAINS = [
  'digitaloceanspaces.com',
  'cdn.digitaloceanspaces.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  's3.amazonaws.com',
  'amazonaws.com',
  // Add other trusted external domains here
];

// Private IP ranges to block (RFC 1918)
const PRIVATE_IP_RANGES = [
  /^10\./,                    // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./,              // 192.168.0.0/16
  /^127\./,                   // 127.0.0.0/8 (localhost)
  /^169\.254\./,              // 169.254.0.0/16 (link-local)
  /^0\.0\.0\.0$/,             // 0.0.0.0
  /^::1$/,                    // IPv6 localhost
  /^fe80:/i,                  // IPv6 link-local
  /^fc00:/i,                  // IPv6 private
];

/**
 * Check if a domain is in the whitelist
 * @param {string} url - The URL to validate
 * @returns {boolean}
 */
function isAllowedDomain(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Block private/internal IPs
    if (isPrivateIP(hostname)) {
      return false;
    }

    // Block localhost variations
    if (hostname === 'localhost' || hostname === '0.0.0.0') {
      return false;
    }

    // Check against whitelist
    return ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch (e) {
    // Invalid URL format
    return false;
  }
}

/**
 * Check if IP is in private range
 * @param {string} hostname - The hostname/IP to check
 * @returns {boolean}
 */
function isPrivateIP(hostname) {
  return PRIVATE_IP_RANGES.some(pattern => pattern.test(hostname));
}

/**
 * Validate Digital Ocean Spaces URL format
 * @param {string} url - The DO Spaces URL to validate
 * @throws {Error} If URL format is invalid
 */
function validateDoSpacesUrl(url) {
  if (!url) {
    throw new Error('DO_SPACES_URL is required but not provided');
  }

  try {
    const parsedUrl = new URL(url);

    // Must use HTTPS
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('DO_SPACES_URL must use HTTPS protocol');
    }

    // Must match Digital Ocean Spaces hostname pattern
    const doSpacesPattern = /^[a-z0-9-]+\.(digitaloceanspaces\.com|cdn\.digitaloceanspaces\.com)$/i;

    if (!doSpacesPattern.test(parsedUrl.hostname)) {
      throw new Error('DO_SPACES_URL must be a valid Digital Ocean Spaces URL');
    }

    return true;
  } catch (error) {
    throw new Error(`Invalid DO_SPACES_URL format: ${error.message}`);
  }
}

/**
 * Validate external request URL (use before making HTTP requests)
 * @param {string} url - The URL to validate
 * @throws {Error} If URL is not allowed
 */
function validateExternalRequest(url) {
  if (!url) {
    throw new Error('URL is required');
  }

  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS (except for localhost in development)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (parsedUrl.protocol !== 'https:' && !isDevelopment) {
      throw new Error('Only HTTPS URLs are allowed');
    }

    // Check domain whitelist
    if (!isAllowedDomain(url)) {
      throw new Error('SSRF Protection: Domain not in whitelist');
    }

    return true;
  } catch (error) {
    if (error.message.includes('SSRF Protection')) {
      throw error;
    }
    throw new Error(`Invalid URL format: ${error.message}`);
  }
}

/**
 * Express middleware to validate URLs in request body/query
 * Use this middleware on routes that accept URLs as input
 *
 * Example usage:
 * const { ssrfProtectionMiddleware } = require('./middlewares/ssrfProtection');
 * router.post('/upload-from-url', ssrfProtectionMiddleware, controller.uploadFromUrl);
 */
function ssrfProtectionMiddleware(req, res, next) {
  const urlFields = ['url', 'imageUrl', 'avatarUrl', 'logoUrl', 'fileUrl'];

  try {
    // Check request body
    if (req.body) {
      for (const field of urlFields) {
        if (req.body[field]) {
          validateExternalRequest(req.body[field]);
        }
      }
    }

    // Check query parameters
    if (req.query) {
      for (const field of urlFields) {
        if (req.query[field]) {
          validateExternalRequest(req.query[field]);
        }
      }
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: `SSRF Protection: ${error.message}`,
    });
  }
}

module.exports = {
  isAllowedDomain,
  validateDoSpacesUrl,
  validateExternalRequest,
  ssrfProtectionMiddleware,
  ALLOWED_DOMAINS,
};
