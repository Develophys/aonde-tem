export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2, "always",
      ["feat", "fix", "chore", "refactor", "test", "docs", "style", "perf", "ci", "build", "revert"],
    ],
    "subject-max-length": [2, "always", 100],
  },
};
