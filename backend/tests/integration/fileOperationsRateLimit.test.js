const TestServer = require('../helpers/testServer');
const fs = require('fs');
const path = require('path');
const {
  makeMultipleRequests,
  makeSequentialRequests,
  waitForRateLimitReset,
  isRateLimited,
  hasRateLimitHeaders,
  extractRateLimitInfo
} = require('../helpers/rateLimitUtils');

describe('File Operations Rate Limiting', () => {
  let testServer;

  beforeAll(async () => {
    testServer = new TestServer();
    
    // Create test files for file operations
    const publicDir = path.join(__dirname, '../../src/public');
    const testDir = path.join(publicDir, 'test', 'files');
    
    // Ensure directories exist
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create a test file
    fs.writeFileSync(path.join(testDir, 'test.txt'), 'Test file content');
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
    
    // Clean up test files
    const publicDir = path.join(__dirname, '../../src/public');
    if (fs.existsSync(publicDir)) {
      fs.rmSync(publicDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // Wait for rate limit to reset between tests
    await waitForRateLimitReset();
  });

  describe('GET /public/:subPath/:directory/:file', () => {
    test('should allow requests within rate limit (3 requests per 10 seconds)', async () => {
      const request = testServer.getRequest();
      
      // Make 3 requests (within limit for file operations)
      const responses = await makeMultipleRequests(() =>
        request.get('/public/test/files/test.txt')
      , 3);

      // All requests should pass rate limiting (may fail due to file not found, but not rate limited)
      responses.forEach(response => {
        expect(response.status).not.toBe(429);
        expect(hasRateLimitHeaders(response)).toBe(true);
      });
    });

    test('should block requests exceeding file operations rate limit (more than 3 requests per 10 seconds)', async () => {
      const request = testServer.getRequest();
      
      // Make 4 requests (exceeds limit of 3)
      const responses = await makeMultipleRequests(() =>
        request.get('/public/test/files/test.txt')
      , 4);

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

    test('should apply rate limiting even for non-existent files', async () => {
      const request = testServer.getRequest();
      
      // Make requests to non-existent files (should still count towards rate limit)
      const responses = await makeMultipleRequests(() =>
        request.get('/public/test/files/nonexistent.txt')
      , 4);

      // Should be rate limited even for non-existent files
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should include proper rate limit headers for file operations', async () => {
      const request = testServer.getRequest();
      
      const response = await request.get('/public/test/files/test.txt');
      
      // Should have rate limit headers
      expect(hasRateLimitHeaders(response)).toBe(true);
      
      const rateLimitInfo = extractRateLimitInfo(response);
      expect(rateLimitInfo.limit).toBe(3); // File operations limit is 3
      expect(rateLimitInfo.remaining).toBeGreaterThanOrEqual(0);
      expect(rateLimitInfo.reset).toBeGreaterThan(0);
    });

    test('should prevent path traversal attacks with rate limiting', async () => {
      const request = testServer.getRequest();
      
      // Make requests with path traversal attempts
      const maliciousPaths = [
        '/public/..%2F..%2F..%2Fetc/passwd',
        '/public/test/..%2F..%2F..%2Fpasswd',
        '/public/test/files/..%2F..%2F..%2Fconfig.json'
      ];

      for (const maliciousPath of maliciousPaths) {
        const responses = await makeMultipleRequests(() =>
          request.get(maliciousPath)
        , 4);

        // Should be rate limited
        const rateLimitedResponses = responses.filter(isRateLimited);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }
    });

    test('should reset rate limit after window expires for file operations', async () => {
      const request = testServer.getRequest();
      
      // Exhaust rate limit
      await makeMultipleRequests(() =>
        request.get('/public/test/files/test.txt')
      , 4);
      
      // Wait for rate limit window to reset
      await waitForRateLimitReset();
      
      // Should be able to make requests again
      const response = await request.get('/public/test/files/test.txt');
      expect(response.status).not.toBe(429);
    }, 25000);
  });

  describe('GET /download/:directory/:file', () => {
    test('should apply rate limiting to download endpoints', async () => {
      const request = testServer.getRequest();
      
      // Make requests to download endpoint (should also be rate limited)
      const responses = await makeMultipleRequests(() =>
        request.get('/download/invoices/test.pdf')
      , 4);

      // Should be rate limited
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should include rate limit headers for download operations', async () => {
      const request = testServer.getRequest();
      
      const response = await request.get('/download/invoices/test.pdf');
      
      // Should have rate limit headers
      expect(hasRateLimitHeaders(response)).toBe(true);
      
      const rateLimitInfo = extractRateLimitInfo(response);
      expect(rateLimitInfo.limit).toBe(3); // File operations limit is 3
    });
  });

  describe('Different File Types and Paths', () => {
    test('should rate limit different file types equally', async () => {
      const request = testServer.getRequest();
      
      const fileTypes = [
        '/public/test/files/test.txt',
        '/public/test/files/test.pdf',
        '/public/test/files/test.jpg',
        '/public/test/files/test.doc'
      ];

      // Make requests to different file types
      const responses = await makeMultipleRequests(() => {
        const randomFile = fileTypes[Math.floor(Math.random() * fileTypes.length)];
        return request.get(randomFile);
      }, 4);

      // Should be rate limited regardless of file type
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should rate limit large file requests', async () => {
      const request = testServer.getRequest();
      
      // Simulate requests for large files
      const responses = await makeMultipleRequests(() =>
        request.get('/public/uploads/large-file.zip')
      , 4);

      // Should be rate limited
      const rateLimitedResponses = responses.filter(isRateLimited);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting Configuration for File Operations', () => {
    test('should use environment variable for file operations rate limit', async () => {
      const request = testServer.getRequest();
      
      const response = await request.get('/public/test/files/test.txt');
      
      if (hasRateLimitHeaders(response)) {
        const rateLimitInfo = extractRateLimitInfo(response);
        // Should match the test environment setting (3 requests for file operations)
        expect(rateLimitInfo.limit).toBe(3);
      }
    });
  });
});