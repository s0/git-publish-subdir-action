module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  collectCoverageFrom: [
    '<rootDir>/src/**/*'
  ],
  collectCoverage: true,
  "coverageReporters": ["none"],
  globalSetup: '<rootDir>/test/jest-global-setup.ts',
  globalTeardown: '<rootDir>/test/jest-global-teardown.ts',
};