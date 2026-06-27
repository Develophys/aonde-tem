const base = require("@aonde-tem/config/jest/base.cjs");
module.exports = {
  ...base,
  testMatch: ["**/*.spec.ts", "**/*.test.ts"],
};
