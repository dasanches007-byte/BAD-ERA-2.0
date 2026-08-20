import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      // A leading underscore is the project's deliberate signal for an argument
      // that exists to satisfy an interface but is intentionally unused —
      // e.g. the fulfillment adapter contract's `submitOrder(_request)`.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    // Generated from the live schema; not hand-maintained.
    files: ["src/lib/db/generated.types.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The delivered Kickoff v0.2 package keeps its published checksums; do not
    // reformat these to satisfy lint.
    "supabase/**",
  ]),
]);

export default eslintConfig;
