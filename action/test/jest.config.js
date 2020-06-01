module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  globalSetup: '<rootDir>/test/jest-global-setup.ts',
  globalTeardown: '<rootDir>/test/jest-global-teardown.ts',
  testMatch: [
    '<rootDir>/test/**/*.spec.ts',
  ],
};