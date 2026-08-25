import tseslint from "typescript-eslint";

const eslintConfig = [
  ...tseslint.configs.recommended,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"]
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
    }
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly"
      }
    }
  },
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        caches: "readonly",
        fetch: "readonly"
      }
    }
  }
];

export default eslintConfig;
