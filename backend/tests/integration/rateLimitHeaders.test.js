const TestServer = require('../helpers/testServer');
const {
  makeMultipleRequests,
  waitForRateLimitReset,
  isRateLimited,
  hasRateLimitHeaders,
  extractRateLimitInfo
} = require('../helpers/rateLimitUtils');

describe('Rate Limit Headers and Middleware Configuration Tests', () => {
  let testServer;

  beforeAll(async () => {
    testServer = new TestServer();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
  });

  beforeEach(async () => {
    // Wait for rate limit to reset between tests
    await waitForRateLimitReset();
  });

  describe('Rate Limit Headers Presence and Format', () => {
    test('should include standard rate limit headers in all responses', async () => {
      const request = testServer.getRequest();
      
      const endpoints = [
        () => request.post('/api/setup').send({ name: 'Test', email: 'test@test.com', password: 'pass' }),
        () => request.get('/public/test/file.txt'),
        () => request.get('/download/test/file.pdf'),
        () => request.get('/api/setting/list')
      ];

      for (const endpoint of endpoints) {
        const response = await endpoint();
        
        // All endpoints should have rate limit headers
        expect(hasRateLimitHeaders(response)).toBe(true);
        
        // Verify header format and values
        const headers = response.headers;
        expect(headers['ratelimit-limit']).toMatch(/^\d+$/);
        expect(headers['ratelimit-remaining']).toMatch(/^\d+$/);
        expect(headers['ratelimit-reset']).toMatch(/^\d+$/);
      }
    });

    test('should use modern RateLimit-* headers instead of legacy X-RateLimit-* headers', async () => {
      const request = testServer.getRequest();
      
      const response = await request.get('/api/setting/list');
      
      // Should use modern headers
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
      
      // Should NOT use legacy headers
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
      expect(response.headers['x-ratelimit-remaining']).toBeUndefined();
      expect(response.headers['x-ratelimit-reset']).toBeUndefined();
    });

    test('should provide accurate remaining count in headers', async () => {
      const request = testServer.getRequest();
      
      // Make sequential requests and track remaining count
      const response1 = await request.get('/public/test/file.txt');
      const info1 = extractRateLimitInfo(response1);
      
      const response2 = await request.get('/public/test/file.txt');
      const info2 = extractRateLimitInfo(response2);
      
      // Remaining count should decrease
      expect(info2.remaining).toBeLessThan(info1.remaining);
      expect(info2.remaining).toBe(info1.remaining - 1);
    });

    test('should show zero remaining when rate limit is exceeded', async () => {
      const request = testServer.getRequest();
      
      // Exhaust rate limit
      const responses = await makeMultipleRequests(() =>
        request.post('/api/setup').send({
          name: 'Test',
          email: 'test@test.com',
          password: 'password'
        })
      , 3);

      const rateLimitedResponse = responses.find(isRateLimited);
      const rateLimitInfo = extractRateLimitInfo(rateLimitedResponse);
      
      // Remaining should be 0 when rate limited
      expect(rateLimitInfo.remaining).toBe(0);
    });
  });

  describe('Rate Limit Reset Time Headers', () => {
    test('should provide accurate reset time in Unix timestamp format', async () => {
      const request = testServer.getRequest();
      
      const response = await request.get('/api/setting/list');
      const rateLimitInfo = extractRateLimitInfo(response);
      
      // Reset time should be a future Unix timestamp
      const now = Math.floor(Date.now() / 1000);
      expect(rateLimitInfo.reset).toBeGreaterThan(now);
      expect(rateLimitInfo.reset).toBeLessThan(now + 60); // Should be within next minute
    });

    test('should update reset time correctly for different rate limiters', async () => {
      const request = testServer.getRequest();
      
      // Different endpoints have different windows
      const setupResponse = await request.post('/api/setup').send({
        name: 'Test',
        email: 'test@test.com',
        password: 'password'
      });
      
      const globalResponse = await request.get('/api/setting/list');
      
      const setupInfo = extractRateLimitInfo(setupResponse);
      const globalInfo = extractRateLimitInfo(globalResponse);
      
      // Both should have valid reset times
      const now = Math.floor(Date.now() / 1000);
      expect(setupInfo.reset).toBeGreaterThan(now);
      expect(globalInfo.reset).toBeGreaterThan(now);
    });
  });

  describe('Rate Limit Configuration Validation', () => {
    test('should respect environment variable configurations', async () => {
      const request = testServer.getRequest();
      
      // Test different endpoints to verify their configured limits
      const testCases = [
        {
          endpoint: () => request.post('/api/setup').send({ name: 'Test', email: 'test@test.com', password: 'pass' }),
          expectedLimit: 2 // RATE_LIMIT_MAX_SETUP
        },
        {
          endpoint: () => request.get('/public/test/file.txt'),
          expectedLimit: 3 // RATE_LIMIT_MAX_FILE_OPS
        },
        {
          endpoint: () => request.get('/api/setting/list'),
          expectedLimit: 10 // RATE_LIMIT_MAX (global)
        }
      ];

      for (const testCase of testCases) {
        const response = await testCase.endpoint();
        const rateLimitInfo = extractRateLimitInfo(response);
        
        expect(rateLimitInfo.limit).toBe(testCase.expectedLimit);
      }
    });

    test('should use correct window duration from environment variables', async () => {
      const request = testServer.getRequest();
      
      const startTime = Math.floor(Date.now() / 1000);
      const response = await request.get('/api/setting/list');
      const rateLimitInfo = extractRateLimitInfo(response);
      
      // Reset time should reflect the configured window (10 seconds in test env)
      const expectedResetTime = startTime + 10; // 10 second window
      expect(rateLimitInfo.reset).toBeGreaterThanOrEqual(startTime);
      expect(rateLimitInfo.reset).toBeLessThanOrEqual(expectedResetTime + 2); // Allow 2 second tolerance
    });
  });

  describe('Middleware Integration and Ordering', () => {
    test('should apply rate limiting before authentication middleware', async () => {
      const request = testServer.getRequest();
      
      // Make excessive requests to authenticated endpoint without valid token
      const responses = await makeMultipleRequests(() =>
        request.get('/api/admin/read/123')
          .set('Authorization', 'Bearer invalid-token')
      , 12);

      // Should be rate limited before authentication check
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Rate limited responses should return 429, not 401 (unauthorized)
      rateLimitedResponses.forEach(response => {
        expect(response.status).toBe(429);
      });
    });

    test('should apply specific rate limiters before global rate limiter', async () => {
      const request = testServer.getRequest();
      
      // Setup endpoint should hit specific rate limiter (2 requests) before global (10 requests)
      const responses = await makeMultipleRequests(() =>
        request.post('/api/setup').send({
          name: 'Test',
          email: 'test@test.com',
          password: 'password'
        })
      , 3);

      const rateLimitedResponse = responses.find(isRateLimited);
      const rateLimitInfo = extractRateLimitInfo(rateLimitedResponse);
      
      // Should be limited by setup-specific limiter (2), not global (10)
      expect(rateLimitInfo.limit).toBe(2);
    });

    test('should maintain rate limiting across middleware chain', async () => {
      const request = testServer.getRequest();
      
      // Test with various middleware combinations
      const middlewareTests = [
        // CORS + Rate Limiting
        () => request.get('/api/setting/list')
          .set('Origin', 'http://localhost:3000'),
        
        // JSON parsing + Rate Limiting
        () => request.post('/api/setup')
          .send({ name: 'Test', email: 'test@test.com', password: 'pass' }),
        
        // File serving + Rate Limiting
        () => request.get('/public/test/file.txt')
      ];

      for (const test of middlewareTests) {
        // Reset between tests
        await waitForRateLimitReset();
        
        const responses = await makeMultipleRequests(test, 12);
        const rateLimitedCount = responses.filter(isRateLimited).length;
        
        // Each should have rate limiting applied
        expect(rateLimitedCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Header Consistency Across Different Response Types', () => {
    test('should include rate limit headers in successful responses', async () => {
      const request = testServer.getRequest();
      
      // Make request that should succeed (business logic wise)
      const response = await request.get('/api/setting/list');
      
      // Even successful responses should have rate limit headers
      expect(hasRateLimitHeaders(response)).toBe(true);
    });

    test('should include rate limit headers in error responses (non-rate-limit errors)', async () => {
      const request = testServer.getRequest();
      
      // Make request that should fail with validation error
      const response = await request.post('/api/setup').send({
        email: 'invalid-email'
      });

      // Even validation error responses should have rate limit headers
      expect(hasRateLimitHeaders(response)).toBe(true);
    });

    test('should include rate limit headers in 404 responses', async () => {
      const request = testServer.getRequest();
      
      const response = await request.get('/api/nonexistent-endpoint');
      
      // 404 responses should also have rate limit headers
      expect(hasRateLimitHeaders(response)).toBe(true);
    });
  });

  describe('IP-based Rate Limiting Headers', () => {
    test('should provide different header values for different IP addresses', async () => {
      const request = testServer.getRequest();
      
      // Make requests from different IPs
      const response1 = await request.get('/api/setting/list')
        .set('X-Forwarded-For', '192.168.1.1');
        
      const response2 = await request.get('/api/setting/list')
        .set('X-Forwarded-For', '192.168.1.2');

      // Both should have rate limit headers
      expect(hasRateLimitHeaders(response1)).toBe(true);
      expect(hasRateLimitHeaders(response2)).toBe(true);
      
      const info1 = extractRateLimitInfo(response1);
      const info2 = extractRateLimitInfo(response2);
      
      // Both should start with same limit and remaining count (different IPs)
      expect(info1.limit).toBe(info2.limit);
      expect(info1.remaining).toBe(info2.remaining);
    });

    test('should track rate limit separately per IP address', async () => {
      const request = testServer.getRequest();
      
      // Exhaust limit for first IP
      await makeMultipleRequests(() =>
        request.get('/public/test/file.txt').set('X-Forwarded-For', '192.168.1.1')
      , 4);
      
      // Second IP should still have full limit
      const response = await request.get('/public/test/file.txt')
        .set('X-Forwarded-For', '192.168.1.2');
        
      expect(response.status).not.toBe(429);
      
      const rateLimitInfo = extractRateLimitInfo(response);
      expect(rateLimitInfo.remaining).toBe(2); // Should have almost full limit (3-1=2)
    });
  });
});