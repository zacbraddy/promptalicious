import createEslintConfig from "@promptalicious/shared-infra/eslint";

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  rules: {
    "no-console": "off",
  },
});
