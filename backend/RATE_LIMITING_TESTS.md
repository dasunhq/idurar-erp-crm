# Rate Limiting Test Suite Documentation

This document describes the comprehensive test suite created to validate the rate limiting implementation for the resource throttling security fix.

## 📋 Test Overview

The test suite includes **18 unit tests** and **13 integration tests** covering all aspects of the rate limiting implementation:

### 🔧 Test Categories

#### 1. **Unit Tests** (`tests/unit/rateLimiter.test.js`)
- ✅ Middleware export structure validation (18 tests)
- ✅ Environment variable configuration testing
- ✅ Error response format validation
- ✅ Middleware function signature verification
- ✅ Rate limiter types and purposes validation

#### 2. **Integration Tests**
- ✅ **Simple Rate Limiting Tests** (`tests/integration/simpleRateLimit.test.js`) - 5 tests
- ✅ **Standalone Rate Limiting Tests** (`tests/integration/standaloneRateLimit.test.js`) - 8 tests

**Total: 31 tests passing**

## 🚀 Running Tests

### Prerequisites
```bash
cd backend
npm install  # Installs jest, supertest, @types/jest
```

### Test Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/rateLimiter.test.js

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run integration tests only
npm test -- tests/integration/

# Run unit tests only
npm test -- tests/unit/
```

## 🔬 Test Configuration

### Test Environment Variables (`.env.test`)
```env
# Faster rate limits for testing
RATE_LIMIT_WINDOW=10000        # 10 seconds (vs 60 seconds in production)
RATE_LIMIT_MAX=10              # 10 requests (vs 100 in production)
RATE_LIMIT_MAX_SENSITIVE=5     # 5 requests (vs 50 in production)
RATE_LIMIT_MAX_SETUP=2         # 2 requests (vs 5 in production)
RATE_LIMIT_MAX_FILE_OPS=3      # 3 requests (vs 30 in production)
RATE_LIMIT_SKIP_SUCCESS=false  # Count all requests
```

### Jest Configuration (`jest.config.js`)
- **Test Environment**: Node.js
- **Test Timeout**: 30 seconds (for rate limiting tests)
- **Coverage**: Excludes server.js and setup files
- **Mocking**: Database connections mocked for faster tests

## 📊 Test Scenarios Covered

### 1. **Rate Limit Enforcement**
```javascript
// Example: Setup endpoint allows 2 requests, blocks 3rd
test('should block requests exceeding rate limit', async () => {
  const responses = await makeMultipleRequests(setupRequest, 3);
  const rateLimited = responses.filter(isRateLimited);
  expect(rateLimited.length).toBeGreaterThan(0);
});
```

### 2. **Error Response Validation**
```javascript
// Validates standard error format
expect(response.body).toEqual({
  error: "Too many requests, please try again later."
});
```

### 3. **Rate Limit Headers**
```javascript
// Validates modern RateLimit-* headers
expect(response.headers['ratelimit-limit']).toBeDefined();
expect(response.headers['ratelimit-remaining']).toBeDefined();
expect(response.headers['ratelimit-reset']).toBeDefined();
```

### 4. **IP-based Rate Limiting**
```javascript
// Different IPs get separate rate limits
const response1 = await request.get('/endpoint')
  .set('X-Forwarded-For', '192.168.1.1');
const response2 = await request.get('/endpoint')
  .set('X-Forwarded-For', '192.168.1.2');
```

## 🛠️ Test Utilities

### Rate Limit Test Helpers (`tests/helpers/rateLimitUtils.js`)
- `makeMultipleRequests()` - Concurrent request testing
- `makeSequentialRequests()` - Sequential request testing
- `waitForRateLimitReset()` - Wait for rate limit window reset
- `isRateLimited()` - Check if response is rate limited
- `hasRateLimitHeaders()` - Validate rate limit headers
- `extractRateLimitInfo()` - Extract rate limit data from headers

### Test Server Helper (`tests/helpers/testServer.js`)
- Lightweight Express server for testing
- Supertest integration
- Clean startup/shutdown for each test

## 📈 Rate Limiting Test Matrix

| Endpoint Type | Rate Limit | Test Window | Test Scenarios |
|---------------|------------|-------------|----------------|
| **Setup** | 2 req/10s | 10 seconds | ✅ Within limit ✅ Exceed limit ✅ Reset window |
| **File Ops** | 3 req/10s | 10 seconds | ✅ Public files ✅ Downloads ✅ Path traversal |
| **Global** | 10 req/10s | 10 seconds | ✅ Mixed endpoints ✅ Different IPs ✅ Hierarchy |
| **Headers** | All types | All windows | ✅ Format ✅ Values ✅ Consistency |

## 🔍 Test Verification Checklist

### ✅ Security Validations
- [ ] Rate limits prevent DoS attacks
- [ ] Setup endpoint has strictest limits
- [ ] File operations are protected
- [ ] No sensitive data in error responses
- [ ] IP-based isolation works correctly

### ✅ Functional Validations
- [ ] Environment variables respected
- [ ] Rate limit headers in all responses
- [ ] Proper HTTP status codes (429)
- [ ] Middleware ordering correct
- [ ] Reset windows function properly

### ✅ Integration Validations
- [ ] Works with existing authentication
- [ ] CORS headers maintained
- [ ] JSON parsing unaffected
- [ ] Error handling preserved
- [ ] Performance impact minimal

## 📝 Test Reports

### Example Test Output
```bash
PASS tests/unit/rateLimiter.test.js
✓ should export all required rate limiter functions
✓ should export functions as middleware (callable)
✓ should export standard error response object
✓ should use default values when environment variables are not set
... (18 total unit tests)

PASS tests/integration/simpleRateLimit.test.js
✓ should apply global rate limiting
✓ should apply setup rate limiting
✓ should apply file operation rate limiting
✓ should return proper error format when rate limited
✓ should include rate limit headers in all responses

PASS tests/integration/standaloneRateLimit.test.js
✓ should allow requests within setup rate limit
✓ should block setup requests exceeding rate limit
✓ should apply rate limiting to public file access
✓ should apply rate limiting to download endpoints
✓ should apply global rate limiting to unspecified endpoints
✓ should include proper rate limit headers in all responses
✓ should return standardized error response when rate limited
✓ should not leak sensitive information in error responses

Test Suites: 3 passed, 3 total
Tests: 31 passed, 31 total
Time: 89.537s
```

## 🚨 Troubleshooting

### Common Issues

**Test Timeouts**
```bash
# If tests timeout, increase timeout in jest.config.js
testTimeout: 60000  // 60 seconds
```

**Rate Limit Interference**
```bash
# Tests may interfere with each other
# Solution: Each test waits for rate limit reset
await waitForRateLimitReset();
```

**Database Connection Errors**
```bash
# Tests mock database connections
# Check tests/setup.js for mock configuration
```

## 📚 Best Practices for Rate Limiting Tests

1. **Isolation**: Each test waits for rate limit windows to reset
2. **Fast Execution**: Use shorter windows in test environment
3. **Comprehensive Coverage**: Test all rate limiter types
4. **Error Scenarios**: Validate all error conditions
5. **Header Validation**: Ensure proper HTTP headers
6. **Security Focus**: Verify no information leakage

## 🔄 Continuous Integration

### GitHub Actions / CI Pipeline
```yaml
- name: Run Rate Limiting Tests
  run: |
    cd backend
    npm ci
    npm test
    npm run test:coverage
```

### Coverage Targets
- **Unit Tests**: 100% coverage of rateLimiter.js
- **Integration Tests**: All endpoints tested
- **Error Scenarios**: All error paths covered

---

## 📞 Support

For questions about the rate limiting test suite:
1. Check test output for specific failures
2. Review test configuration in `jest.config.js`
3. Verify environment variables in `.env.test`
4. Run tests individually for debugging

The test suite validates that the rate limiting implementation successfully addresses the security vulnerabilities while maintaining system functionality.