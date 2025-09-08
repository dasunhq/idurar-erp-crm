import crypto from 'crypto';

// Security middleware for development server
export function setupSecurityHeaders() {
  return (req, res, next) => {
    // Generate a nonce for inline scripts/styles
    const nonce = crypto.randomBytes(16).toString('base64');
    
    // Ensure res.locals exists before setting properties
    if (!res.locals) {
      res.locals = {};
    }
    res.locals.nonce = nonce;

    // Content Security Policy with development-friendly but secure settings
    const cspDirectives = [
      // Allow everything from same origin
      "default-src 'self'",

      // Scripts: Allow self and minimal unsafe settings for Vite HMR
      // Note: Vite requires both 'unsafe-eval' and 'unsafe-inline' for development mode
      // In production, these should be removed and replaced with nonces/hashes
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:3000",

      // Styles: Allow self, nonce-based inline styles, and Google Fonts
      // Keep unsafe-inline only for development to avoid breaking Ant Design and Vite
      `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`,

      // Images: Allow self and data URLs only
      "img-src 'self' data:",

      // Fonts: Allow self and specific Google Fonts domains only
      "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",

      // Connections: Allow self, localhost for dev API, and websockets for HMR
      "connect-src 'self' http://localhost:3000 http://localhost:8888 ws://localhost:3000 ws://localhost:8888",

      // Frames: Only allow self
      "frame-src 'self'",

      // Frame ancestors: Prevent embedding (clickjacking protection)
      "frame-ancestors 'none'",

      // Objects: None allowed
      "object-src 'none'",

      // Base URI: Only self
      "base-uri 'self'",

      // Form actions: Only self
      "form-action 'self'",

      // Media sources: Only self
      "media-src 'self'",

      // Worker sources: Only self
      "worker-src 'self'",

      // Manifest sources: Only self
      "manifest-src 'self'",
    ];

    // Set security headers
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Expose nonce for frontend use
    res.setHeader('X-CSP-Nonce', nonce);

    next();
  };
}
