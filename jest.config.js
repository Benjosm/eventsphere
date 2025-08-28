module.exports = {
  // The root directory used to resolve all pattern definitions
  rootDir: '.',
  
  // Set up test environment after frameworks are installed
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/backend/tests/**/*.test.ts',
    '**/backend/tests/**/*.spec.ts'
  ],

  // A map from regular expressions to paths to modules that will load modules for the given patterns
  transform: {
    // Use ts-jest to transform TypeScript files
    '^.+\\.tsx?$': 'ts-jest'
  },

  // An array of regexp pattern strings that are matched against all source file paths before transformation
  // This is useful for ignoring files that shouldn't be transformed
  transformIgnorePatterns: [
    '/node_modules/'
  ],

  // A list of paths to directories that Jest should use to search for files in
  moduleDirectories: [
    'node_modules',
    'backend'
  ],

  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: false,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage'
};
