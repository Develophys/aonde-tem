const base = require("@aonde-tem/config/jest/base.cjs");
module.exports = {
  ...base,
  testMatch: ["**/*.spec.ts", "**/*.test.ts"],
  moduleNameMapper: {
    // Remap workspace packages to their TS source so ts-jest can compile them
    // (their dist/ is ESM which CJS Jest cannot parse)
    "^@aonde-tem/contracts$": "<rootDir>/../../packages/contracts/src/index.ts",
    "^@aonde-tem/domain$": "<rootDir>/../../packages/domain/src/index.ts",
    // Preserve the base .js → TS source remapping for relative imports
    ...(base.moduleNameMapper ?? {}),
  },
};
