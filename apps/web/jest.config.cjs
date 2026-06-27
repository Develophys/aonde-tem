/** Web Jest config — jsdom + Testing Library. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  moduleNameMapper: {
    "\\.(css|less|scss)$": "<rootDir>/test/style-mock.cjs",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  clearMocks: true,
};
