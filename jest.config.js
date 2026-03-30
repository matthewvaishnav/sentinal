module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 35,
      lines: 45,
      statements: 45
    }
  },
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  verbose: true
};
