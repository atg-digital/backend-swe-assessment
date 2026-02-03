// Jest setup file
// Configures environment and mocks for all tests

// Set test environment variables
process.env.DYNAMODB_TABLE = 'test-ticket-inventory';
process.env.AWS_REGION = 'us-east-1';
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise and prevent test failures
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  // Suppress console output during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(10000);
