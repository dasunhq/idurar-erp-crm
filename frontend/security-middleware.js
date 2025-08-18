import crypto from 'crypto';

// Security middleware for development server
export function setupSecurityHeaders() {
  return (req, res, next) => {
    // Generate a fresh nonce for each request
    const nonce = crypto.randomBytes(16).toString('base64');
    
    // Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'unsafe-inline' 'nonce-${nonce}' https://fonts.googleapis.com`,
      "img-src 'self' data:",
      "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
      "connect-src 'self' http://localhost:8888 ws://localhost:3000",
      "frame-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];
    
    // Set security headers
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Make nonce available to templates
    res.locals.nonce = nonce;
    
    next();
  };
}