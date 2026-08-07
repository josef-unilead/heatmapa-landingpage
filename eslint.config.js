import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.pgdata-test']),
  // Serverové funkce, skripty a testy běží v nodu, ne v prohlížeči.
  // Bez tohohle bloku hlásí eslint process a Buffer jako neznámé.
  {
    files: ['api/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.js', 'vite.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // Velká počáteční písmena jsou komponenty. Bez eslint-plugin-react
      // nevidí základní pravidlo použití v JSX, takže by hlásilo jako
      // nepoužité i to, co se vykresluje. Platí i na parametry, kvůli
      // zápisu typu function Field({ icon: Icon }).
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^[A-Z_]',
      }],
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['api/**', 'scripts/**', 'tests/**'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Velká počáteční písmena jsou komponenty. Bez eslint-plugin-react
      // nevidí základní pravidlo použití v JSX, takže by hlásilo jako
      // nepoužité i to, co se vykresluje. Platí i na parametry, kvůli
      // zápisu typu function Field({ icon: Icon }).
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^[A-Z_]',
      }],
    },
  },
])
