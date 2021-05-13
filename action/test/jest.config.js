module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  globalSetup: '<rootDir>/test/jest-global-setup.ts',
  testMatch: [
    '<rootDir>/test/**/*.spec.ts',
  ],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/test/jest-global-setup-hooks.ts'
  ],
};