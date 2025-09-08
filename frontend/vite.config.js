import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import { setupSecurityHeaders } from './security-middleware';

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  const proxy_url =
    process.env.VITE_DEV_REMOTE === 'remote'
      ? process.env.VITE_BACKEND_SERVER
      : 'http://localhost:8888/';

  const isDevelopment = mode === 'development';

  const config = {
    plugins: [
      // Configure React plugin with proper settings
      react({
        // Ensure fast refresh works correctly
        fastRefresh: true,
        // Avoid preamble detection issues
        include: '**/*.{jsx,tsx,js,ts}',
      }),
      // Apply our security headers
      {
        name: 'security-headers',
        configureServer(server) {
          server.middlewares.use(setupSecurityHeaders());
        },
      }
    ],
    resolve: {
      base: '/',
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3000,
      hmr: {
        // Force the HMR websocket to use the same hostname
        // This helps with CSP restrictions
        host: 'localhost',
        protocol: 'ws',
      },
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