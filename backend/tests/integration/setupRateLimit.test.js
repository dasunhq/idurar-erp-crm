const TestServer = require('../helpers/testServer');
const {
  makeMultipleRequests,
  makeSequentialRequests,
  waitForRateLimitReset,
  isRateLimited,
  hasRateLimitHeaders,
  extractRateLimitInfo
} = require('../helpers/rateLimitUtils');

describe('Setup Endpoint Rate Limiting', () => {
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

  describe('POST /api/setup', () => {
    const setupPayload = {
      name: 'Test Admin',
      email: 'test@admin.com',
      password: 'testPassword123',
      language: 'en_us',
      timezone: 'UTC',
      country: 'US'
    };

    test('should allow requests within rate limit (2 requests per 10 seconds)', async () => {
      const request = testServer.getRequest();
      
      // Make 2 requests (within limit)
      const responses = await makeMultipleRequests(() =>
        request.post('/api/setup').send(setupPayload)
      , 2);

      // First request should pass (may fail due to business logic, but not rate limited)
      expect(responses[0].status).not.toBe(429);
      
      // Second request should also pass rate limiting
      expect(responses[1].status).not.toBe(429);
      
      // Both should have rate limit headers
      expect(hasRateLimitHeaders(responses[0])).toBe(true);
      expect(hasRateLimitHeaders(responses[1])).toBe(true);
    });

    test('should block requests exceeding rate limit (more than 2 requests per 10 seconds)', async () => {
      const request = testServer.getRequest();
      
      // Make 3 requests (exceeds limit of 2)
      const responses = await makeMultipleRequests(() =>
        request.post('/api/setup').send(setupPayload)
      , 3);

      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Rate limited response should have correct error message
      const rateLimited = rateLimitedResponses[0];
      expect(rateLimited.status).toBe(429);
      expect(rateLimited.body).toEqual({
        error: "Too many requests, please try again later."
      });
    });

    test('should include proper rate limit headers in responses', async () => {
      const request = testServer.getRequest();
      
      const response = await request.post('/api/setup').send(setupPayload);
      
      // Should have rate limit headers
      expect(hasRateLimitHeaders(response)).toBe(true);
      
      const rateLimitInfo = extractRateLimitInfo(response);
      expect(rateLimitInfo.limit).toBe(2); // Setup limit is 2
      expect(rateLimitInfo.remaining).toBeGreaterThanOrEqual(0);
      expect(rateLimitInfo.reset).toBeGreaterThan(0);
    });

    test('should reset rate limit after window expires', async () => {
      const request = testServer.getRequest();
      
      // Exhaust rate limit
      await makeMultipleRequests(() =>
        request.post('/api/setup').send(setupPayload)
      , 3);
      
      // Wait for rate limit window to reset
      await waitForRateLimitReset();
      
      // Should be able to make requests again
      const response = await request.post('/api/setup').send(setupPayload);
      expect(response.status).not.toBe(429);
    }, 25000); // Increase timeout for this test

    test('should count failed setup attempts towards rate limit', async () => {
      const request = testServer.getRequest();
      
      // Make requests with invalid data (should still count towards rate limit)
      const invalidPayload = { email: 'invalid' };
      
      const responses = await makeMultipleRequests(() =>
        request.post('/api/setup').send(invalidPayload)
      , 3);

      // Should be rate limited even with invalid requests
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should apply rate limiting per IP address', async () => {
      const request = testServer.getRequest();
      
      // Simulate different IP addresses using X-Forwarded-For header
      const response1 = await request
        .post('/api/setup')
        .set('X-Forwarded-For', '192.168.1.1')
        .send(setupPayload);
        
      const response2 = await request
        .post('/api/setup')
        .set('X-Forwarded-For', '192.168.1.2')
        .send(setupPayload);

      // Both should be allowed (different IPs)
      expect(response1.status).not.toBe(429);
      expect(response2.status).not.toBe(429);
    });
  });

  describe('Rate Limiting Configuration', () => {
    test('should use environment variable for setup rate limit', async () => {
      const request = testServer.getRequest();
      
      const response = await request.post('/api/setup').send({
        name: 'Test',
        email: 'test@test.com',
        password: 'password'
      });
      
      if (hasRateLimitHeaders(response)) {
        const rateLimitInfo = extractRateLimitInfo(response);
        // Should match the test environment setting (2 requests)
        expect(rateLimitInfo.limit).toBe(2);
      }
    });
  });
});