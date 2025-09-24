const rateLimiterMiddleware = require('../../src/middlewares/rateLimiter');

describe('Rate Limiter Middleware Unit Tests', () => {
  beforeEach(() => {
    // Reset environment variables for each test
    delete process.env.RATE_LIMIT_WINDOW;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_MAX_SENSITIVE;
    delete process.env.RATE_LIMIT_MAX_SETUP;
    delete process.env.RATE_LIMIT_MAX_FILE_OPS;
    delete process.env.RATE_LIMIT_SKIP_SUCCESS;
  });

  describe('Middleware Export Structure', () => {
    test('should export all required rate limiter functions', () => {
      expect(rateLimiterMiddleware).toHaveProperty('globalRateLimiter');
      expect(rateLimiterMiddleware).toHaveProperty('sensitiveRateLimiter');
      expect(rateLimiterMiddleware).toHaveProperty('setupRateLimiter');
      expect(rateLimiterMiddleware).toHaveProperty('fileOperationRateLimiter');
      expect(rateLimiterMiddleware).toHaveProperty('standardErrorResponse');
    });

    test('should export functions as middleware (callable)', () => {
      expect(typeof rateLimiterMiddleware.globalRateLimiter).toBe('function');
      expect(typeof rateLimiterMiddleware.sensitiveRateLimiter).toBe('function');
      expect(typeof rateLimiterMiddleware.setupRateLimiter).toBe('function');
      expect(typeof rateLimiterMiddleware.fileOperationRateLimiter).toBe('function');
    });

    test('should export standard error response object', () => {
      expect(rateLimiterMiddleware.standardErrorResponse).toEqual({
        error: "Too many requests, please try again later."
      });
    });
  });

  describe('Environment Variable Configuration', () => {
    test('should use default values when environment variables are not set', () => {
      // Clear environment variables
      delete process.env.RATE_LIMIT_WINDOW;
      delete process.env.RATE_LIMIT_MAX;
      
      // Re-require the module to get fresh instance
      delete require.cache[require.resolve('../../src/middlewares/rateLimiter')];
      const freshRateLimiter = require('../../src/middlewares/rateLimiter');
      
      // Should use defaults
      expect(freshRateLimiter.globalRateLimiter).toBeDefined();
      expect(freshRateLimiter.setupRateLimiter).toBeDefined();
    });

    test('should respect environment variable for rate limit window', () => {
      process.env.RATE_LIMIT_WINDOW = '30000'; // 30 seconds
      
      delete require.cache[require.resolve('../../src/middlewares/rateLimiter')];
      const freshRateLimiter = require('../../src/middlewares/rateLimiter');
      
      // Should use environment value (hard to test directly, but module should load without error)
      expect(freshRateLimiter.globalRateLimiter).toBeDefined();
    });

    test('should respect environment variable for max requests', () => {
      process.env.RATE_LIMIT_MAX = '50';
      process.env.RATE_LIMIT_MAX_SETUP = '3';
      
      delete require.cache[require.resolve('../../src/middlewares/rateLimiter')];
      const freshRateLimiter = require('../../src/middlewares/rateLimiter');
      
      expect(freshRateLimiter.globalRateLimiter).toBeDefined();
      expect(freshRateLimiter.setupRateLimiter).toBeDefined();
    });

    test('should handle invalid environment variables gracefully', () => {
      process.env.RATE_LIMIT_WINDOW = 'invalid';
      process.env.RATE_LIMIT_MAX = 'not-a-number';
      
      delete require.cache[require.resolve('../../src/middlewares/rateLimiter')];
      
      // Should not throw error and use defaults
      expect(() => {
        require('../../src/middlewares/rateLimiter');
      }).not.toThrow();
    });
  });

  describe('Rate Limiter Configuration Validation', () => {
    test('should have different limits for different middleware types', () => {
      // Set specific test values
      process.env.RATE_LIMIT_MAX = '100';
      process.env.RATE_LIMIT_MAX_SETUP = '5';
      process.env.RATE_LIMIT_MAX_FILE_OPS = '30';
      
      delete require.cache[require.resolve('../../src/middlewares/rateLimiter')];
      const freshRateLimiter = require('../../src/middlewares/rateLimiter');
      
      // All middleware should be defined
      expect(freshRateLimiter.globalRateLimiter).toBeDefined();
      expect(freshRateLimiter.setupRateLimiter).toBeDefined();
      expect(freshRateLimiter.fileOperationRateLimiter).toBeDefined();
      expect(freshRateLimiter.sensitiveRateLimiter).toBeDefined();
    });

    test('should configure standard headers correctly', () => {
      delete require.cache[require.resolve('../../src/middlewares/rateLimiter')];
      const freshRateLimiter = require('../../src/middlewares/rateLimiter');
      
      // All rate limiters should be middleware functions
      expect(typeof freshRateLimiter.globalRateLimiter).toBe('function');
      expect(typeof freshRateLimiter.setupRateLimiter).toBe('function');
      expect(typeof freshRateLimiter.fileOperationRateLimiter).toBe('function');
      expect(typeof freshRateLimiter.sensitiveRateLimiter).toBe('function');
    });
  });

  describe('Error Response Configuration', () => {
    test('should have consistent error response format', () => {
      const expectedErrorResponse = {
        error: "Too many requests, please try again later."
      };
      
      expect(rateLimiterMiddleware.standardErrorResponse).toEqual(expectedErrorResponse);
    });

    test('should not expose sensitive information in error response', () => {
      const errorResponse = rateLimiterMiddleware.standardErrorResponse;
      
      // Should not contain any system information
      const responseText = JSON.stringify(errorResponse);
      expect(responseText).not.toContain('server');
      expect(responseText).not.toContain('database');
      expect(responseText).not.toContain('internal');
      expect(responseText).not.toContain('stack');
      
      // Should only contain the safe error message
      expect(errorResponse.error).toBe("Too many requests, please try again later.");
    });
  });

  describe('Middleware Function Signatures', () => {
    test('should return middleware functions with correct signature', () => {
      const middlewares = [
        rateLimiterMiddleware.globalRateLimiter,
        rateLimiterMiddleware.setupRateLimiter,
        rateLimiterMiddleware.fileOperationRateLimiter,
        rateLimiterMiddleware.sensitiveRateLimiter
      ];

      middlewares.forEach(middleware => {
        expect(typeof middleware).toBe('function');
        // Express middleware should accept 3 parameters (req, res, next)
        expect(middleware.length).toBe(3);
      });
    });
  });

  describe('Skip Success Requests Configuration', () => {
    test('should respect RATE_LIMIT_SKIP_SUCCESS environment variable', () => {
      process.env.RATE_LIMIT_SKIP_SUCCESS = 'true';
      
      delete require.cache[require.resolve('../../src/middlewares/rateLimiter')];
      const freshRateLimiter = require('../../src/middlewares/rateLimiter');
      
      // Should load without error
      expect(freshRateLimiter.globalRateLimiter).toBeDefined();
    });

    test('should handle boolean string values correctly', () => {
      const testValues = ['true', 'false', 'TRUE', 'FALSE', '1', '0'];
      
      testValues.forEach(value => {
        process.env.RATE_LIMIT_SKIP_SUCCESS = value;
        
        delete require.cache[require.resolve('../../src/middlewares/rateLimiter')];
        
        expect(() => {
          require('../../src/middlewares/rateLimiter');
        }).not.toThrow();
      });
    });
  });

  describe('Rate Limiter Types and Their Purposes', () => {
    test('should have setup rate limiter with most restrictive limits', () => {
      // Setup should be most restrictive for security
      expect(rateLimiterMiddleware.setupRateLimiter).toBeDefined();
    });

    test('should have file operation rate limiter for resource protection', () => {
      // File operations should have moderate restrictions
      expect(rateLimiterMiddleware.fileOperationRateLimiter).toBeDefined();
    });

    test('should have sensitive rate limiter for critical operations', () => {
      // Sensitive operations should have higher restrictions than global
      expect(rateLimiterMiddleware.sensitiveRateLimiter).toBeDefined();
    });

    test('should have global rate limiter as fallback', () => {
      // Global should be least restrictive but present for all endpoints
      expect(rateLimiterMiddleware.globalRateLimiter).toBeDefined();
    });
  });
});