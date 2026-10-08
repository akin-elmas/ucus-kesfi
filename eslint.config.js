const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['android/*', 'ios/*', 'case-kit/*', '.expo/*', 'coverage/*'],
  },
  {
    files: ['__tests__/**', 'jest.setup.ts'],
    languageOptions: { globals: { jest: 'readonly' } },
  },
]);
