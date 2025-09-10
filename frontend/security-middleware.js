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

    // Content Security Policy with enhanced security settings
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const cspDirectives = [
      // Allow everything from same origin
      "default-src 'self'",

      // Scripts: Use strict nonce-based CSP for better security
      // Note: Removed 'unsafe-eval' for improved security posture
      isDevelopment
        ? `script-src 'self' 'nonce-${nonce}' http://localhost:3000`
        : `script-src 'self' 'nonce-${nonce}'`,

      // Styles: Allow self, nonce-based inline styles, and Google Fonts
      // Keep minimal unsafe-inline only for development compatibility with Ant Design
      isDevelopment
        ? `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`
        : `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,

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

    // Set comprehensive security headers
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Add Strict Transport Security (enabled in all environments for security testing)
    if (!isDevelopment) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    } else {
      // Set HSTS in development for security testing (shorter max-age)
      res.setHeader('Strict-Transport-Security', 'max-age=3600; includeSubDomains');
    }

    // Restrict CORS - more secure than wildcard
    const allowedOrigins = isDevelopment
      ? ['http://localhost:3000', 'http://127.0.0.1:3000']
      : [process.env.FRONTEND_URL || 'https://your-domain.com'];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    } else {
      // Explicitly deny CORS for non-allowed origins
      res.setHeader('Access-Control-Allow-Origin', 'null');
    }

    // Remove server information leak and set secure cache headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Prevent caching of sensitive pages
    if (req.url === '/' || req.url.includes('admin') || req.url.includes('login')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Expose nonce for frontend use
    res.setHeader('X-CSP-Nonce', nonce);

    next();
  };
}
