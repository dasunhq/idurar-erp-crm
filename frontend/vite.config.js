import path from 'path';
import crypto from 'crypto';

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  const proxy_url =
    process.env.VITE_DEV_REMOTE === 'remote'
      ? process.env.VITE_BACKEND_SERVER
      : 'http://localhost:8888/';

  const isDevelopment = mode === 'development';

  const config = {
    plugins: [
      react(),
      // Custom plugin to add CSP headers in development
      {
        name: 'csp-headers',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Generate a fresh nonce for each request
            const nonce = crypto.randomBytes(16).toString('base64');
            
            // Set CSP headers similar to backend configuration
            const cspDirectives = [
              "default-src 'self'",
              `script-src 'self' 'nonce-${nonce}' ${isDevelopment ? 'http://localhost:3000' : ''}`,
              `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`,
              "img-src 'self' data: https:",
              "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
              `connect-src 'self' ${isDevelopment ? 'http://localhost:3000 http://localhost:8888 ws://localhost:3000' : ''}`,
              "frame-src 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'"
            ];
            
            if (!isDevelopment) {
              cspDirectives.push('upgrade-insecure-requests');
            }
            
            res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
            res.setHeader('X-CSP-Nonce', nonce);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            
            next();
          });
        },
      },
    ],
    resolve: {
      base: '/',
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: proxy_url,
          changeOrigin: true,
          secure: false,
        },
        '/sitemap.xml': {
          target: proxy_url,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
  return defineConfig(config);
};
