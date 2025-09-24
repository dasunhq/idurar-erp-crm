const TestServer = require('../helpers/testServer');
const {
  makeMultipleRequests,
  waitForRateLimitReset,
  isRateLimited,
  hasRateLimitHeaders,
  extractRateLimitInfo
} = require('../helpers/rateLimitUtils');

describe('Rate Limit Error Response Integration Tests', () => {
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

  describe('Error Response Format and Structure', () => {
    test('should return standardized error response format when rate limited', async () => {
      const request = testServer.getRequest();
      
      // Trigger rate limiting on setup endpoint
      const responses = await makeMultipleRequests(() =>
        request.post('/api/setup').send({
          name: 'Test',
          email: 'test@test.com',
          password: 'password'
        })
      , 3);

      const rateLimitedResponse = responses.find(isRateLimited);
      expect(rateLimitedResponse).toBeDefined();
      
      // Verify error response structure
      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.headers['content-type']).toMatch(/application\/json/);
      expect(rateLimitedResponse.body).toEqual({
        error: "Too many requests, please try again later."
      });
    });

    test('should maintain consistent error response across different endpoints', async () => {
      const request = testServer.getRequest();
      
      // Test different endpoints that should return same error format
      const endpoints = [
        () => request.post('/api/setup').send({ name: 'Test', email: 'test@test.com', password: 'pass' }),
        () => request.get('/public/test/file.txt'),
        () => request.get('/download/test/file.pdf'),
        () => request.get('/api/setting/list')
      ];

      const rateLimitedResponses = [];
      
      for (const endpoint of endpoints) {
        // Reset rate limit between endpoint tests
        await waitForRateLimitReset();
        
        // Make excessive requests to trigger rate limiting
        const responses = await makeMultipleRequests(endpoint, 15);
        const rateLimited = responses.find(isRateLimited);
        
        if (rateLimited) {
          rateLimitedResponses.push(rateLimited);
        }
      }

      // All rate limited responses should have the same format
      rateLimitedResponses.forEach(response => {
        expect(response.status).toBe(429);
        expect(response.body).toEqual({
          error: "Too many requests, please try again later."
        });
      });
    });

    test('should not leak sensitive information in rate limit error responses', async () => {
      const request = testServer.getRequest();
      
      // Trigger rate limiting
      const responses = await makeMultipleRequests(() =>
        request.post('/api/setup').send({
          name: 'Admin',
          email: 'admin@company.com',
          password: 'secretPassword123'
        })
      , 3);

      const rateLimitedResponse = responses.find(isRateLimited);
      
      // Error response should not contain any sensitive data
      const responseText = JSON.stringify(rateLimitedResponse.body);
      expect(responseText).not.toContain('admin@company.com');
      expect(responseText).not.toContain('secretPassword123');
      expect(responseText).not.toContain('Admin');
      
      // Should only contain the standard error message
      expect(rateLimitedResponse.body).toEqual({
        error: "Too many requests, please try again later."
      });
    });
  });

  describe('HTTP Status Codes and Headers', () => {
    test('should return 429 status code for rate limited requests', async () => {
      const request = testServer.getRequest();
      
      // Trigger rate limiting
      const responses = await makeMultipleRequests(() =>
        request.get('/public/test/file.txt')
      , 5);

      const rateLimitedResponse = responses.find(isRateLimited);
      expect(rateLimitedResponse.status).toBe(429);
    });

    test('should include appropriate headers in rate limited responses', async () => {
      const request = testServer.getRequest();
      
      // Trigger rate limiting
      const responses = await makeMultipleRequests(() =>
        request.post('/api/setup').send({
          name: 'Test',
          email: 'test@test.com',
          password: 'password'
        })
      , 3);

      const rateLimitedResponse = responses.find(isRateLimited);
      
      // Should have rate limiting headers
      expect(hasRateLimitHeaders(rateLimitedResponse)).toBe(true);
      
      // Should have proper content type
      expect(rateLimitedResponse.headers['content-type']).toMatch(/application\/json/);
      
      // Extract and verify rate limit headers
      const rateLimitInfo = extractRateLimitInfo(rateLimitedResponse);
      expect(rateLimitInfo.limit).toBeGreaterThan(0);
      expect(rateLimitInfo.remaining).toBe(0); // Should be 0 when rate limited
      expect(rateLimitInfo.reset).toBeGreaterThan(0);
    });

    test('should handle CORS headers correctly in rate limited responses', async () => {
      const request = testServer.getRequest();
      
      // Make request with CORS headers
      const responses = await makeMultipleRequests(() =>
        request.post('/api/setup')
          .set('Origin', 'http://localhost:3000')
          .send({
            name: 'Test',
            email: 'test@test.com',
            password: 'password'
          })
      , 3);

      const rateLimitedResponse = responses.find(isRateLimited);
      
      // Should maintain CORS headers even when rate limited
      expect(rateLimitedResponse.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Error Response Timing and Behavior', () => {
    test('should respond quickly to rate limited requests (no artificial delays)', async () => {
      const request = testServer.getRequest();
      
      // First, trigger rate limiting
      await makeMultipleRequests(() =>
        request.get('/public/test/file.txt')
      , 4);

      // Measure response time for rate limited request
      const startTime = Date.now();
      const response = await request.get('/public/test/file.txt');
      const responseTime = Date.now() - startTime;

      if (response.status === 429) {
        // Rate limited response should be fast (< 1 second)
        expect(responseTime).toBeLessThan(1000);
      }
    });

    test('should maintain rate limiting state across multiple rapid requests', async () => {
      const request = testServer.getRequest();
      
      // Make very rapid requests
      const rapidRequests = [];
      for (let i = 0; i < 10; i++) {
        rapidRequests.push(
          request.post('/api/setup').send({
            name: `Test${i}`,
            email: `test${i}@test.com`,
            password: 'password'
          })
        );
      }

      const responses = await Promise.all(rapidRequests);
      
      // Should have consistent rate limiting behavior
      const rateLimitedCount = responses.filter(isRateLimited).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
      
      // All rate limited responses should be identical
      const rateLimitedResponses = responses.filter(isRateLimited);
      rateLimitedResponses.forEach(response => {
        expect(response.body).toEqual({
          error: "Too many requests, please try again later."
        });
      });
    });
  });

  describe('Integration with Application Error Handling', () => {
    test('should not interfere with normal application errors', async () => {
      const request = testServer.getRequest();
      
      // Make a request that would normally return an application error (not rate limited)
      const response = await request.post('/api/setup').send({
        // Invalid data that should trigger validation error
        email: 'invalid-email'
      });

      // Should not be rate limited initially
      expect(response.status).not.toBe(429);
      
      // Should return application-specific error (validation error)
      expect(response.status).toBe(409); // Or whatever the validation error status is
    });

    test('should handle rate limiting before other middleware errors', async () => {
      const request = testServer.getRequest();
      
      // Trigger rate limiting with invalid data
      const responses = await makeMultipleRequests(() =>
        request.post('/api/setup').send({
          email: 'invalid-email'
        })
      , 3);

      // Some responses should be rate limited (429) before validation errors
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Rate limited responses should take precedence over validation errors
      rateLimitedResponses.forEach(response => {
        expect(response.status).toBe(429);
        expect(response.body).toEqual({
          error: "Too many requests, please try again later."
        });
      });
    });
  });

  describe('Error Response Logging and Monitoring', () => {
    test('should provide adequate information for monitoring rate limiting events', async () => {
      const request = testServer.getRequest();
      
      // Trigger rate limiting
      const responses = await makeMultipleRequests(() =>
        request.get('/public/test/file.txt')
      , 5);

      const rateLimitedResponse = responses.find(isRateLimited);
      
      // Rate limited response should include enough info for monitoring
      expect(rateLimitedResponse.status).toBe(429);
      expect(hasRateLimitHeaders(rateLimitedResponse)).toBe(true);
      
      const rateLimitInfo = extractRateLimitInfo(rateLimitedResponse);
      
      // Headers should provide monitoring data
      expect(rateLimitInfo.limit).toBeGreaterThan(0);
      expect(rateLimitInfo.remaining).toBe(0);
      expect(rateLimitInfo.reset).toBeGreaterThan(Date.now() / 1000);
    });
  });
});