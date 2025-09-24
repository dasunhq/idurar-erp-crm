require('dotenv').config({ path: '.env.test' });
require('dotenv').config({ path: '.env' });

// Override rate limiting values for faster testing
process.env.RATE_LIMIT_WINDOW = '10000'; // 10 seconds for tests
process.env.RATE_LIMIT_MAX = '10';
process.env.RATE_LIMIT_MAX_SENSITIVE = '5';
process.env.RATE_LIMIT_MAX_SETUP = '2';
process.env.RATE_LIMIT_MAX_FILE_OPS = '3';
process.env.RATE_LIMIT_SKIP_SUCCESS = 'false';

// Mock database connection for tests
jest.mock('mongoose', () => ({
  connect: jest.fn(() => Promise.resolve()),
  model: jest.fn(() => ({
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn()
  })),
  Schema: jest.fn(() => ({}))
}));

// Increase timeout for rate limiting tests
jest.setTimeout(30000);