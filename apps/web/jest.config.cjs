/** Web Jest config — jsdom + Testing Library. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  moduleNameMapper: {
    "\\.(css|less|scss)$": "<rootDir>/test/style-mock.cjs",
    // Remap to TS source so ts-jest can compile it — its dist/ is ESM, which CJS Jest
    // cannot parse (same fix as apps/api/jest.config.cjs).
    "^@aonde-tem/contracts$": "<rootDir>/../../packages/contracts/src/index.ts",
    "^@/(.*)\\.js$": "<rootDir>/src/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  clearMocks: true,
};
