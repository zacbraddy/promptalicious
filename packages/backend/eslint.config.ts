import createEslintConfig from "@promptalicious/shared-infra/eslint";

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  ignores: ["scripts/**/*.ts", "workspace/**/*", "tests/fixtures/**/*"],
  rules: {
    "no-console": "off",
  },
});
