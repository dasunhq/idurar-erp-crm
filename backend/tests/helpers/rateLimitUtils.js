/**
 * Rate Limiting Test Utilities
 */

/**
 * Make multiple concurrent requests to test rate limiting
 * @param {Function} requestFunction - Function that returns a supertest request
 * @param {number} count - Number of requests to make
 * @param {number} delay - Delay between requests in ms (default: 0 for concurrent)
 * @returns {Promise<Array>} Array of response objects
 */
async function makeMultipleRequests(requestFunction, count, delay = 0) {
  const requests = [];
  
  for (let i = 0; i < count; i++) {
    if (delay > 0 && i > 0) {
      await sleep(delay);
    }
    requests.push(requestFunction());
  }
  
  return Promise.all(requests);
}

/**
 * Make sequential requests with delay between them
 * @param {Function} requestFunction - Function that returns a supertest request
 * @param {number} count - Number of requests to make
 * @param {number} delay - Delay between requests in ms
 * @returns {Promise<Array>} Array of response objects
 */
async function makeSequentialRequests(requestFunction, count, delay) {
  const responses = [];
  
  for (let i = 0; i < count; i++) {
    if (i > 0) {
      await sleep(delay);
    }
    const response = await requestFunction();
    responses.push(response);
  }
  
  return responses;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for rate limit window to reset
 * @param {number} windowMs - Rate limit window in milliseconds
 * @returns {Promise}
 */
function waitForRateLimitReset(windowMs = 10000) {
  return sleep(windowMs + 1000); // Add 1 second buffer
}

/**
 * Check if response indicates rate limit exceeded
 * @param {Object} response - Supertest response object
 * @returns {boolean}
 */
function isRateLimited(response) {
  return response.status === 429 && 
         response.body && 
         response.body.error === "Too many requests, please try again later.";
}

/**
 * Check if response has rate limit headers
 * @param {Object} response - Supertest response object
 * @returns {boolean}
 */
function hasRateLimitHeaders(response) {
  const headers = response.headers;
  return headers['ratelimit-limit'] !== undefined ||
         headers['ratelimit-remaining'] !== undefined ||
         headers['ratelimit-reset'] !== undefined;
}

/**
 * Extract rate limit info from headers
 * @param {Object} response - Supertest response object
 * @returns {Object} Rate limit info
 */
function extractRateLimitInfo(response) {
  const headers = response.headers;
  return {
    limit: parseInt(headers['ratelimit-limit'] || '0'),
    remaining: parseInt(headers['ratelimit-remaining'] || '0'),
    reset: parseInt(headers['ratelimit-reset'] || '0')
  };
}

module.exports = {
  makeMultipleRequests,
  makeSequentialRequests,
  sleep,
  waitForRateLimitReset,
  isRateLimited,
  hasRateLimitHeaders,
  extractRateLimitInfo
};