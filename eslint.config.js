import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `.claude` holds agent scratch space, including git worktrees — a whole
  // second checkout of this repo with its own tsconfig.json. Linting it is
  // pointless, and leaving it visible makes typescript-eslint refuse to run at
  // all: two candidate tsconfig roots and no way to choose between them.
  globalIgnores(['dist', '.claude']),
  // The app is TypeScript throughout; the only JavaScript left is this file
  // and vite.config.js, which are Node config and carry no JSX or React.
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  // The sweep is a Node script: it has `process` and no DOM.
  {
    files: ['scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // tsc already reports these, with better messages and without the false
      // positives the base rule hits on type-only positions.
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
])
