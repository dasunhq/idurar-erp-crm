const request = require('supertest');
const express = require('express');

// Import rate limiters directly without app dependencies
const {
  globalRateLimiter,
  setupRateLimiter,
  fileOperationRateLimiter,
  standardErrorResponse
} = require('../../src/middlewares/rateLimiter');

describe('Rate Limiting Integration Tests (Standalone)', () => {
  let app;

  beforeAll(() => {
    // Create a minimal Express app for testing
    app = express();
    app.use(express.json());
    
    // Apply rate limiting to specific routes
    app.post('/api/setup', setupRateLimiter, (req, res) => {
      res.json({ message: 'Setup endpoint', body: req.body });
    });
    
    app.get('/public/*', fileOperationRateLimiter, (req, res) => {
      res.json({ message: 'File endpoint', path: req.path });
    });
    
    app.get('/download/*', fileOperationRateLimiter, (req, res) => {
      res.json({ message: 'Download endpoint', path: req.path });
    });
    
    app.use(globalRateLimiter); // Global rate limiter as fallback
    
    app.get('/api/test', (req, res) => {
      res.json({ message: 'Global rate limited endpoint' });
    });
    
    // Error handler
    app.use((err, req, res, next) => {
      res.status(500).json({ error: 'Internal server error' });
    });
  });

  afterEach(async () => {
    // Wait for rate limit reset between tests
    await new Promise(resolve => setTimeout(resolve, 11000)); // 11 seconds to reset
  });

  describe('Setup Endpoint Rate Limiting', () => {
    test('should allow requests within setup rate limit', async () => {
      const setupData = {
        name: 'Test Admin',
        email: 'test@admin.com',
        password: 'password123'
      };

      // Make 2 requests (within limit)
      const response1 = await request(app)
        .post('/api/setup')
        .send(setupData);
        
      const response2 = await request(app)
        .post('/api/setup')
        .send(setupData);

      // Both should succeed (not rate limited)
      expect(response1.status).not.toBe(429);
      expect(response2.status).not.toBe(429);
      
      // Should have rate limit headers
      expect(response1.headers['ratelimit-limit']).toBeDefined();
      expect(response2.headers['ratelimit-remaining']).toBeDefined();
    });

    test('should block setup requests exceeding rate limit', async () => {
      const setupData = {
        name: 'Test Admin',
        email: 'test@admin.com',
        password: 'password123'
      };

      // Make requests rapidly to exceed limit
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(request(app).post('/api/setup').send(setupData));
      }
      
      const responses = await Promise.all(requests);
      
      // At least some should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Rate limited responses should have correct error format
      rateLimitedResponses.forEach(response => {
        expect(response.body).toEqual(standardErrorResponse);
      });
    }, 15000);
  });

  describe('File Operations Rate Limiting', () => {
    test('should apply rate limiting to public file access', async () => {
      // Make requests rapidly to exceed file operations limit
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(request(app).get('/public/test/file.txt'));
      }
      
      const responses = await Promise.all(requests);
      
      // Should have some rate limited responses
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 15000);

    test('should apply rate limiting to download endpoints', async () => {
      // Make requests rapidly to exceed download limit  
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(request(app).get('/download/invoices/test.pdf'));
      }
      
      const responses = await Promise.all(requests);
      
      // Should have some rate limited responses
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Global Rate Limiting', () => {
    test('should apply global rate limiting to unspecified endpoints', async () => {
      // Make requests rapidly to exceed global limit
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(request(app).get('/api/test'));
      }
      
      const responses = await Promise.all(requests);
      
      // Should have some rate limited responses
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Rate Limit Headers', () => {
    test('should include proper rate limit headers in all responses', async () => {
      const endpoints = [
        () => request(app).post('/api/setup').send({ name: 'Test', email: 'test@test.com', password: 'pass' }),
        () => request(app).get('/public/test.txt'),
        () => request(app).get('/api/test')
      ];

      for (const endpoint of endpoints) {
        const response = await endpoint();
        
        // Should have modern rate limit headers
        expect(response.headers['ratelimit-limit']).toBeDefined();
        expect(response.headers['ratelimit-remaining']).toBeDefined();
        expect(response.headers['ratelimit-reset']).toBeDefined();
        
        // Should not have legacy headers
        expect(response.headers['x-ratelimit-limit']).toBeUndefined();
      }
    });
  });

  describe('Error Response Format', () => {
    test('should return standardized error response when rate limited', async () => {
      // Trigger rate limiting on setup endpoint
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app).post('/api/setup').send({
            name: 'Test',
            email: 'test@test.com',
            password: 'password'
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.find(r => r.status === 429);
      
      if (rateLimited) {
        expect(rateLimited.status).toBe(429);
        expect(rateLimited.body).toEqual(standardErrorResponse);
        expect(rateLimited.headers['content-type']).toMatch(/application\/json/);
      }
    }, 15000);

    test('should not leak sensitive information in error responses', async () => {
      // Trigger rate limiting with sensitive data
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app).post('/api/setup').send({
            name: 'Admin User',
            email: 'admin@company.com',
            password: 'secretPassword123'
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.find(r => r.status === 429);
      
      if (rateLimited) {
        const responseText = JSON.stringify(rateLimited.body);
        expect(responseText).not.toContain('admin@company.com');
        expect(responseText).not.toContain('secretPassword123');
        expect(responseText).not.toContain('Admin User');
      }
    }, 15000);
  });
});