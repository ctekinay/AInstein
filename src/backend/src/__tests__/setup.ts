// Test setup file for Jest
import 'jest';

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.ENABLE_STRICT_PARSING = 'true';
process.env.ENABLE_RESPONSE_VALIDATION = 'true';
process.env.ENABLE_INTENT_ANALYSIS = 'true';

// Global test timeout
jest.setTimeout(10000);

// Dummy test to prevent "no tests" error
describe('Setup', () => {
  it('should configure test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});