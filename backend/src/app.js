const express = require('express');
const crypto = require('crypto');
const path = require('path');

const cors = require('cors');
const compression = require('compression');
const csrf = require('csurf');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// SSRF Protection
const { validateDoSpacesUrl } = require('./middlewares/ssrfProtection');

const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');

const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');

// OAuth Strategies
const googleStrategy = require('./middlewares/authStrategies/googleStrategy');
const facebookStrategy = require('./middlewares/authStrategies/facebookStrategy');

const errorHandlers = require('./handlers/errorHandlers');
const erpApiRouter = require('./routes/appRoutes/appApi');

// Import rate limiters for DOS protection
const {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  publicLimiter
} = require('./middlewares/rateLimiter');

// Removed express-fileupload due to security vulnerabilities (Snyk report 2025-10-04)
// Using multer instead for secure file upload handling
// create our Express app
const app = express();

// Validate DO_SPACES_URL to prevent SSRF attacks
if (process.env.DO_SPACES_URL) {
  try {
    validateDoSpacesUrl(process.env.DO_SPACES_URL);
    console.log('✓ DO_SPACES_URL validation passed');
  } catch (error) {
    console.error('✗ DO_SPACES_URL validation failed:', error.message);
    // Don't exit in development, but warn
    if (process.env.NODE_ENV === 'production') {
      console.error('Exiting due to invalid DO_SPACES_URL in production');
      process.exit(1);
    }
  }
}

// Remove X-Powered-By header for security
app.disable('x-powered-by');

// Configure CORS with restrictive origins for security
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'https://your-domain.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for OAuth
app.use(
  session({
    secret: process.env.JWT_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Sanitize data against NoSQL injection attacks
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`This request[${key}] is sanitized`, req);
  }
}));

app.use(compression());

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization (required for session support)
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const mongoose = require('mongoose');
    const Admin = mongoose.model('Admin');
    const user = await Admin.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Configure OAuth strategies (must be before other routes)
googleStrategy(app);
facebookStrategy(app);

// Middleware to generate and attach nonce for CSP
app.use((req, res, next) => {
  // Generate a fresh nonce for each request
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Security middleware - helmet with nonce-based CSP
const isDevelopment = process.env.NODE_ENV !== 'production';

// Configure Content-Security-Policy with enhanced security (no unsafe directives)
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      // Scripts: self + nonce + specific hash for React DevTools
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
        "'sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk='", // React DevTools hash
        ...(isDevelopment ? ['http://localhost:3000'] : []),
      ],
      // Styles: self + Google Fonts + unsafe-inline for Ant Design
      // Note: Removed nonce from style-src to allow unsafe-inline to work
      styleSrc: [
        "'self'",
        'https://fonts.googleapis.com',
        "'unsafe-inline'", // Required for Ant Design inline styles
      ],
      // Images: self + data: + Google profile images for OAuth (required for authentication)
      imgSrc: ["'self'", 'data:', 'https://lh3.googleusercontent.com'],
      // Fonts: self + Google Fonts
      fontSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
      // Connections: self + localhost for dev API/WS
      connectSrc: isDevelopment
        ? ["'self'", 'http://localhost:3000', 'http://localhost:8888', 'ws://localhost:3000', 'ws://localhost:8888']
        : ["'self'"],
      frameSrc: ["'self'"],
      frameAncestors: ["'none'"], // Prevent clickjacking
      objectSrc: ["'none'"], // Restrict <object>, <embed>, and <applet> elements
      baseUri: ["'self'"], // Restrict base URI to same-origin
      formAction: ["'self'"], // Restrict form submissions to same-origin
      mediaSrc: ["'self'"], // Media sources: Only self
      workerSrc: ["'self'"], // Worker sources: Only self
      manifestSrc: ["'self'"], // Manifest sources: Only self
      ...(isDevelopment ? {} : { upgradeInsecureRequests: [] }), // Force HTTPS in production only
    },
  })
);

// Apply other Helmet security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // We already configured CSP above
    xssFilter: true,
    noSniff: true,
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  })
);

// Middleware to expose nonce to frontend (for Ant Design inline styles)
app.use((req, res, next) => {
  // Add nonce to response headers so frontend can access it
  res.setHeader('X-CSP-Nonce', res.locals.nonce);
  next();
});

// CSRF Protection Configuration
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Removed express-fileupload due to Arbitrary File Upload vulnerabilities
// File uploads now handled securely by multer in specific routes with validation

// Apply DOS protection rate limiters before routes
// More specific routes first, then general rate limiter
app.use('/api/login', authLimiter); // Stricter limit for login (5 req/15min)
app.use('/api/forgetpassword', passwordResetLimiter); // Stricter limit for password reset
app.use('/api/resetpassword', passwordResetLimiter); // Stricter limit for password reset
app.use('/api', apiLimiter); 
app.use('/download', uploadLimiter); // Rate limit file downloads (20 req/15min)
app.use('/public', publicLimiter); // More permissive for public routes (200 req/15min) 
// CSP Nonce endpoint for frontend
app.get('/api/nonce', (req, res) => {
  res.setHeader('X-CSP-Nonce', res.locals.nonce);
  res.json({ success: true, nonce: res.locals.nonce });
});

// Sitemap.xml endpoint with CSP headers
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://localhost:3000/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>http://localhost:3000/login</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>http://localhost:3000/forgotPassword</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`);
});

// Sitemap.xml endpoint with CSP headers
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://localhost:3000/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>http://localhost:3000/login</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>http://localhost:3000/forgotPassword</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`);
});

// Here our API Routes

// Auth routes (login, csrf-token) don't need CSRF protection
app.use('/api', coreAuthRouter);
// Protected routes need CSRF protection
app.use('/api', csrfProtection, adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', csrfProtection, adminAuth.isValidAuthToken, erpApiRouter);
app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

// Serve static files from frontend build (for production) or development
// Note: isDevelopment is already defined above for CSP configuration

if (!isDevelopment) {
  // In production, serve the built frontend files
  const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendBuildPath));

  // Handle client-side routing - serve index.html for non-API routes
  app.get('*', publicLimiter, (req, res, next) => {
    // Skip API routes, downloads, and public routes
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/download') ||
      req.path.startsWith('/public')
    ) {
      return next();
    }

    // Serve index.html with CSP headers for all other routes
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // In development, serve a simple HTML that redirects to the correct development setup
  app.get('*', (req, res, next) => {
    // Skip API routes, downloads, and public routes
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/download') ||
      req.path.startsWith('/public')
    ) {
      return next();
    }
    // For development, serve a page that explains the correct setup
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>IDURAR Development Setup</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <h1>IDURAR Development Server</h1>
        <p>This is the backend server running on port 8888.</p>
        <p>For development with CSP headers, please:</p>
        <ol>
          <li>Run the frontend development server: <code>cd frontend && npm run dev</code></li>
          <li>Access the application at: <a href="http://localhost:3000">http://localhost:3000</a></li>
        </ol>
        <p>The frontend will proxy API requests to this backend server.</p>
        <hr>
        <p><strong>Note:</strong> CSP headers are configured and active on this server. API endpoints will have proper security headers.</p>
      </body>
      </html>
    `);
  });
}

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// production error handler
app.use(errorHandlers.productionErrors);

// done! we export it so we can start the site in start.js
module.exports = app;
