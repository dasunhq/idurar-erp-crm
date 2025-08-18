const express = require('express');
const crypto = require('crypto');

const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');

const cookieParser = require('cookie-parser');

const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');

const errorHandlers = require('./handlers/errorHandlers');
const erpApiRouter = require('./routes/appRoutes/appApi');

const fileUpload = require('express-fileupload');
// create our Express app
const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(compression());

// Middleware to generate and attach nonce for CSP
app.use((req, res, next) => {
  // Generate a fresh nonce for each request
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Security middleware - helmet with nonce-based CSP
const isDevelopment = process.env.NODE_ENV !== 'production';

// Configure Content-Security-Policy with nonces (Option B)
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      // Scripts: self + nonce (no unsafe-inline)
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
        ...(isDevelopment ? ['http://localhost:3000'] : [])
      ],
      // Styles: self + nonce + Google Fonts (no unsafe-inline)
      styleSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
        'https://fonts.googleapis.com'
      ],
      // Images: self + data: + https: (for flexibility with external images)
      imgSrc: ["'self'", 'data:', 'https:'],
      // Fonts: self + Google Fonts
      fontSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
      // Connections: self + localhost for dev API/WS
      connectSrc: isDevelopment 
        ? ["'self'", 'http://localhost:3000', 'ws://localhost:3000'] 
        : ["'self'"],
      frameSrc: ["'self'"],
      frameAncestors: ["'none'"], // Prevent clickjacking
      objectSrc: ["'none'"], // Restrict <object>, <embed>, and <applet> elements
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
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// Middleware to expose nonce to frontend (for Ant Design inline styles)
app.use((req, res, next) => {
  // Add nonce to response headers so frontend can access it
  res.setHeader('X-CSP-Nonce', res.locals.nonce);
  next();
});

// // default options
// app.use(fileUpload());

// CSP Nonce endpoint for frontend
app.get('/api/nonce', (req, res) => {
  res.json({ success: true });
});

// Here our API Routes

app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// production error handler
app.use(errorHandlers.productionErrors);

// done! we export it so we can start the site in start.js
module.exports = app;
