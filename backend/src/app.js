const express = require('express');

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

// Security middleware - helmet with custom CSP
const isDevelopment = process.env.NODE_ENV !== 'production';

// Configure Content-Security-Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isDevelopment
          ? ["'self'", "'unsafe-inline'", 'http://localhost:3000']
          : ["'self'"],
        styleSrc: isDevelopment
          ? ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']
          : ["'self'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https://cdn.example.com'], // Replace with your actual CDNs if needed
        fontSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        connectSrc: isDevelopment ? ["'self'", 'ws://localhost:3000'] : ["'self'"],
        frameSrc: ["'self'"],
        frameAncestors: ["'none'"], // Prevent clickjacking
        objectSrc: ["'none'"], // Restrict <object>, <embed>, and <applet> elements
        upgradeInsecureRequests: !isDevelopment ? [] : null, // Force HTTPS in production
      },
    },
    // Additional security headers
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// // default options
// app.use(fileUpload());

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
