/* eslint-env node */
require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  "root": true,
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:vue/vue3-recommended",
    "plugin:vue-pug/vue3-recommended",
    //"@vue/eslint-config-typescript/recommended"
  ],

  "parser": "vue-eslint-parser",
  "parserOptions": {
    "parser": "@typescript-eslint/parser",
    "project": ["./tsconfig.json"],
    "extraFileExtensions" : [".vue"]
  },
  "ignorePatterns": ["vite.config.ts", ".eslintrc.cjs", "env.d.ts"],

  "plugins": ["@typescript-eslint"],

  "overrides": [
  {
    "files": ["*.ts", "*.vue"],
    "rules": {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"], // Prefer using "type" to "interface".

      // WIP, needs fixing.
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      // WIP, needs fixing. Axios
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",

      // WIP, needs discussion.
      "vue/html-quotes": "off",
      "vue/max-attributes-per-line": "off",
      "vue/attributes-order": "off",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "warn"
    },
  },
],
}
