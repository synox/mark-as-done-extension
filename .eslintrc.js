module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
  },
  extends: 'airbnb',
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-use-before-define': 'off',
    'no-undef': 'error',
    'no-console': 'off',
    'no-return-await': 'off',
    'no-param-reassign': 'off',
    'import/extensions': 'off',
    'require-await': 'error',
    'no-restricted-syntax': 'off',
    'no-plusplus': 'off',
  },
  ignorePatterns: ['3rdparty/**'],
};
