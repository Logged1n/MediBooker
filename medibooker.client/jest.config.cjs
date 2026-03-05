/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  // Only pick up *.test.{js,jsx} — leaves *.spec.{js,ts} free for Playwright e2e tests
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/*.test.[jt]s?(x)'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  // Ignore Playwright test files so jest doesn't try to pick them up
  testPathIgnorePatterns: ['/node_modules/', '\\.spec\\.'],
  moduleNameMapper: {
    // Stub out CSS imports — not relevant for unit tests
    '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.cjs',
  },
};
