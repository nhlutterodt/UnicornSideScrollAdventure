export default {
  testEnvironment: 'jest-environment-jsdom',
  transform: {},
  setupFilesAfterEnv: [],
  testMatch: [
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],
  // tests/ holds Playwright specs (*.integration.spec.js, *.regression.spec.js) -
  // they import from @playwright/test, not Jest, and must never be picked up here.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tests/'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
