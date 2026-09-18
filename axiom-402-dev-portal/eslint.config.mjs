import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/** @type {import("eslint").Linter.Config[]} */
const config = [
  // Next.js core rules + TypeScript
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript"
  ),

  // Project-wide overrides
  {
    rules: {
      // Enforce consistent use of `import type` for type-only imports.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // Disallow `any` — use `unknown` and narrow explicitly.
      "@typescript-eslint/no-explicit-any": "error",

      // No unused variables (prefix with _ to intentionally ignore).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Prefer nullish coalescing (??) over || for nullable values.
      "@typescript-eslint/prefer-nullish-coalescing": "warn",

      // Enforce optional chaining (?.) over manual null checks.
      "@typescript-eslint/prefer-optional-chain": "warn",

      // React 19+ — JSX transform does not require React in scope.
      "react/react-in-jsx-scope": "off",
    },
  },

  // Ignore generated / build output
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
    ],
  },
];

export default config;
