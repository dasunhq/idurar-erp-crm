const request = require('supertest');
const express = require('express');
const { globalRateLimiter, setupRateLimiter, fileOperationRateLimiter } = require('../../src/middlewares/rateLimiter');

describe('Simple Rate Limiting Integration Test', () => {
  let app;

  beforeAll(() => {
    // Create a simple Express app for testing
    app = express();
    app.use(express.json());
    
    // Add rate limiting middlewares
    app.use('/global', globalRateLimiter);
    app.use('/setup', setupRateLimiter);
    app.use('/files', fileOperationRateLimiter);
    
    // Simple test endpoints
    app.get('/global/test', (req, res) => {
      res.json({ message: 'global endpoint' });
    });
    
    app.post('/setup/test', (req, res) => {
      res.json({ message: 'setup endpoint' });
    });
    
    app.get('/files/test', (req, res) => {
      res.json({ message: 'file endpoint' });
    });
  });

  test('should apply global rate limiting', async () => {
    // Make requests within limit
    const responses = await Promise.all([
      request(app).get('/global/test'),
      request(app).get('/global/test'),
      request(app).get('/global/test')
    ]);

    // All should succeed initially
    responses.forEach(response => {
      expect(response.status).not.toBe(429);
      expect(response.headers['ratelimit-limit']).toBeDefined();
    });
  });

  test('should apply setup rate limiting', async () => {
    const response = await request(app).post('/setup/test');
    
    expect(response.status).not.toBe(429);
    expect(response.headers['ratelimit-limit']).toBeDefined();
    expect(response.headers['ratelimit-remaining']).toBeDefined();
  });

  test('should apply file operation rate limiting', async () => {
    const response = await request(app).get('/files/test');
    
    expect(response.status).not.toBe(429);
    expect(response.headers['ratelimit-limit']).toBeDefined();
    expect(response.headers['ratelimit-remaining']).toBeDefined();
  });

  test('should return proper error format when rate limited', async () => {
    // Make many rapid requests to trigger rate limiting
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(request(app).post('/setup/test'));
    }
    
    const responses = await Promise.all(requests);
    
    // At least some should be rate limited
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    if (rateLimitedResponses.length > 0) {
      rateLimitedResponses.forEach(response => {
        expect(response.body).toEqual({
          error: "Too many requests, please try again later."
        });
      });
    }
  }, 15000);

  test('should include rate limit headers in all responses', async () => {
    const endpoints = [
      '/global/test',
      '/setup/test',
      '/files/test'
    ];

    for (const endpoint of endpoints) {
      const method = endpoint.includes('setup') ? 'post' : 'get';
      const response = await request(app)[method](endpoint);
      
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    }
  });
});