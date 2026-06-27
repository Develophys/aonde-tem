// ESLint v9 flat config — shared across the monorepo.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/coverage/**",
      "prisma/migrations/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Node-land (api + packages)
  {
    files: ["apps/api/**/*.ts", "packages/**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
  },

  // Browser-land (web)
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },

  // 🔒 Domain purity — the inner circle imports NOTHING framework-specific.
  // Enforces the Clean Architecture dependency rule at lint time.
  {
    files: ["packages/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@nestjs/*",
            "react",
            "react-dom",
            "@prisma/client",
            "express",
            "vite",
            "zod",
            "@aonde-tem/contracts",
          ],
        },
      ],
    },
  },

  // Test files can be looser.
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },

  prettier,
);
