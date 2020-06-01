module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  collectCoverageFrom: [
    '<rootDir>/src/**/*'
  ],
  collectCoverage: true,
  "coverageReporters": ["none"],
};