module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
  },
  extends: 'airbnb',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-use-before-define': 'off',
    'no-undef': 'off',
    'no-console': 'off',
    'no-return-await': 'off',
  },
  ignorePatterns: ['3rdparty/**'],
};
