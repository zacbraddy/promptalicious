import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import type { Linter } from "eslint";

import baseConfig from "./base.config.ts";
import frontendConfig from "./frontend.config.ts";

type RulesRecord = Linter.RulesRecord;

export default function createEslintConfig(
  options: {
    tsconfigRootDir?: string;
    isFrontend?: boolean;
    rules?: RulesRecord;
    ignores?: string[];
  } = {},
) {
  return tseslint.config(
    {
      ignores: [
        "dist",
        "node_modules",
        "vitest.shims.d.ts",
        ...(options.ignores || []),
      ],
    },
    ...baseConfig,
    ...(options.isFrontend ? frontendConfig : []),
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: options.tsconfigRootDir ?? ".",
        },
      },
    },
    ...(options.rules ? [{ rules: options.rules }] : []),
    eslintConfigPrettier,
  );
}
