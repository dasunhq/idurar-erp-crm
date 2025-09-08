import crypto from 'crypto';

// Security middleware for development server
export function setupSecurityHeaders() {
  return (req, res, next) => {
    // For development environment, we'll use a more permissive CSP
    // This will avoid most CSP-related issues during development
    
    // Content Security Policy with relaxed development mode settings
    const cspDirectives = [
      // Allow everything from same origin
      "default-src 'self'",
      
      // Very permissive script settings for development
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https:",
      
      // Very permissive style settings for development
      "style-src 'self' 'unsafe-inline' https: data:",
      
      // Allow images from self, https and data URLs
      "img-src 'self' https: data:",
      
      // Allow fonts from anywhere
      "font-src 'self' https: data:",
      
      // Allow connections to localhost with any port and websockets
      "connect-src 'self' ws: wss: http: https:",
      
      // Other security settings
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'"
    ];
    
    // Set security headers - in development we're more permissive
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    next();
  };
}