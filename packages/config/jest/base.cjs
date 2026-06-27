/** Shared Jest base for Node-environment packages (ts-jest). */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],
  clearMocks: true,
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  // Allow TS source that uses ESM-style ".js" import specifiers (e.g. "./x.js").
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
