module.exports = {
  env: { node: true, es2022: true, jest: true },
  extends: 'eslint:recommended',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'no-debugger': 'error',
    'prefer-const': 'warn',
    'no-var': 'error',
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      env: { jest: true },
      rules: { 'no-undefined': 'off' },
    },
  ],
};
