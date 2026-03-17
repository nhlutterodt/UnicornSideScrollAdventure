export default {
  testEnvironment: 'jest-environment-jsdom',
  transform: {},
  setupFilesAfterEnv: [],
  testMatch: [
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
