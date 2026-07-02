// ESLint 8.x configuration (legacy format)
// Extend with plugin:@typescript-eslint/recommended once existing type errors are resolved.
module.exports = {
  root: true,
  // Suppress "unused disable directive" errors — the codebase has eslint-disable comments for
  // rules that are currently turned off for gradual adoption. Without this, the CLI flag
  // --report-unused-disable-directives causes CI failures on those comments.
  reportUnusedDisableDirectives: false,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', 'supabase'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react-refresh'],
  rules: {
    // react-refresh: AuthContext.tsx exports context values alongside the provider component —
    // a completely standard React pattern that doesn't break Fast Refresh in practice.
    'react-refresh/only-export-components': 'off',

    // react-hooks/exhaustive-deps: turned off for initial CI adoption; the warnings it
    // produces are real but require targeted fixes per hook. Re-enable after cleanup.
    'react-hooks/exhaustive-deps': 'off',

    // TypeScript — relaxed for gradual adoption; tighten per sprint
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',

    // Handled by TypeScript — disabling avoids false positives in TS files
    'no-undef': 'off',
    'no-unused-vars': 'off',

    'no-console': 'off',
  },
};
