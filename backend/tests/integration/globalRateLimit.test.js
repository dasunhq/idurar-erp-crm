const TestServer = require('../helpers/testServer');
const {
  makeMultipleRequests,
  makeSequentialRequests,
  waitForRateLimitReset,
  isRateLimited,
  hasRateLimitHeaders,
  extractRateLimitInfo
} = require('../helpers/rateLimitUtils');

describe('Global Rate Limiting', () => {
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

  describe('Global Rate Limiter for All Endpoints', () => {
    test('should allow requests within global rate limit (10 requests per 10 seconds)', async () => {
      const request = testServer.getRequest();
      
      // Make requests to various endpoints within global limit
      const endpoints = [
        () => request.get('/api/admin/read/123'),
        () => request.get('/api/setting/list'),
        () => request.post('/api/login').send({ email: 'test@test.com', password: 'test' }),
        () => request.get('/public/test/file.txt')
      ];

      // Make 8 requests (within global limit of 10)
      const responses = await makeMultipleRequests(() => {
        const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        return randomEndpoint();
      }, 8);

      // None should be rate limited due to global limit
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBe(0);
      
      // All should have rate limit headers
      responses.forEach(response => {
        expect(hasRateLimitHeaders(response)).toBe(true);
      });
    });

    test('should block requests exceeding global rate limit (more than 10 requests per 10 seconds)', async () => {
      const request = testServer.getRequest();
      
      // Make 12 requests (exceeds global limit of 10)
      const responses = await makeMultipleRequests(() =>
        request.get('/api/setting/list')
      , 12);

      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should apply global rate limiting to authenticated endpoints', async () => {
      const request = testServer.getRequest();
      
      // Make requests to authenticated endpoints
      const responses = await makeMultipleRequests(() =>
        request.get('/api/admin/read/123')
          .set('Authorization', 'Bearer fake-token')
      , 12);

      // Should be rate limited by global limiter
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should apply global rate limiting to unauthenticated endpoints', async () => {
      const request = testServer.getRequest();
      
      // Make requests to public endpoints
      const responses = await makeMultipleRequests(() =>
        request.post('/api/login').send({ email: 'test@test.com', password: 'test' })
      , 12);

      // Should be rate limited by global limiter
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit Hierarchy', () => {
    test('should prioritize specific rate limiters over global rate limiter', async () => {
      const request = testServer.getRequest();
      
      // Setup endpoint has specific rate limiter (2 requests)
      // This should trigger before global rate limiter (10 requests)
      const responses = await makeMultipleRequests(() =>
        request.post('/api/setup').send({
          name: 'Test',
          email: 'test@test.com',
          password: 'password'
        })
      , 3);

      // Should be rate limited by setup-specific limiter (not global)
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Check that it's limited by setup limiter (2 requests)
      const firstResponse = responses[0];
      if (hasRateLimitHeaders(firstResponse)) {
        const rateLimitInfo = extractRateLimitInfo(firstResponse);
        expect(rateLimitInfo.limit).toBe(2); // Setup specific limit
      }
    });

    test('should use global rate limiter for endpoints without specific limits', async () => {
      const request = testServer.getRequest();
      
      // Test endpoint that doesn't have specific rate limiting
      const response = await request.get('/api/setting/list');
      
      if (hasRateLimitHeaders(response)) {
        const rateLimitInfo = extractRateLimitInfo(response);
        expect(rateLimitInfo.limit).toBe(10); // Global limit
      }
    });
  });

  describe('Mixed Endpoint Requests', () => {
    test('should handle mixed requests to different endpoint types', async () => {
      const request = testServer.getRequest();
      
      // Mix of different endpoint types
      const mixedRequests = [
        // Global rate limited endpoints
        () => request.get('/api/setting/list'),
        () => request.post('/api/login').send({ email: 'test@test.com', password: 'pass' }),
        // File operations (specific rate limit)
        () => request.get('/public/test/file.txt'),
        // Setup (specific rate limit) 
        () => request.post('/api/setup').send({ name: 'Test', email: 'test@test.com', password: 'pass' })
      ];

      // Make multiple mixed requests
      const responses = [];
      for (let i = 0; i < 15; i++) {
        const randomRequest = mixedRequests[Math.floor(Math.random() * mixedRequests.length)];
        responses.push(await randomRequest());
      }

      // Should have some rate limited responses
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Different endpoints should have different limits
      const limits = new Set();
      responses.forEach(response => {
        if (hasRateLimitHeaders(response)) {
          const rateLimitInfo = extractRateLimitInfo(response);
          limits.add(rateLimitInfo.limit);
        }
      });
      
      // Should have multiple different limits (global, setup, file operations)
      expect(limits.size).toBeGreaterThan(1);
    });
  });

  describe('Global Rate Limit Configuration', () => {
    test('should use environment variable for global rate limit', async () => {
      const request = testServer.getRequest();
      
      const response = await request.get('/api/setting/list');
      
      if (hasRateLimitHeaders(response)) {
        const rateLimitInfo = extractRateLimitInfo(response);
        // Should match the test environment setting (10 requests for global)
        expect(rateLimitInfo.limit).toBe(10);
      }
    });

    test('should reset global rate limit after window expires', async () => {
      const request = testServer.getRequest();
      
      // Exhaust global rate limit
      await makeMultipleRequests(() =>
        request.get('/api/setting/list')
      , 12);
      
      // Wait for rate limit window to reset
      await waitForRateLimitReset();
      
      // Should be able to make requests again
      const response = await request.get('/api/setting/list');
      expect(response.status).not.toBe(429);
    }, 25000);
  });

  describe('Edge Cases', () => {
    test('should handle concurrent requests from different IPs', async () => {
      const request = testServer.getRequest();
      
      // Simulate requests from different IPs
      const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
      
      const responses = await Promise.all(
        ips.map(ip => 
          makeMultipleRequests(() =>
            request.get('/api/setting/list').set('X-Forwarded-For', ip)
          , 8)
        )
      );

      // Each IP should be able to make requests up to the limit
      responses.forEach(ipResponses => {
        const rateLimitedCount = ipResponses.filter(isRateLimited).length;
        expect(rateLimitedCount).toBe(0); // Within limit for each IP
      });
    });

    test('should maintain separate counters for different rate limiters', async () => {
      const request = testServer.getRequest();
      
      // Make requests to setup endpoint (specific limiter)
      await makeMultipleRequests(() =>
        request.post('/api/setup').send({
          name: 'Test',
          email: 'test@test.com',
          password: 'password'
        })
      , 2);
      
      // Should still be able to make requests to other endpoints (global limiter)
      const response = await request.get('/api/setting/list');
      expect(response.status).not.toBe(429);
    });
  });
});