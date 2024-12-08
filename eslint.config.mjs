import prettier from 'eslint-plugin-prettier'
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default [
  ...compat.extends('eslint:recommended', 'prettier'),
  {
    plugins: {
      prettier,
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.webextensions,
      },

      ecmaVersion: 2020,
      sourceType: 'module',

      parserOptions: {
        ecmaFeatures: {
          experimentalObjectRestSpread: true,
        },
      },
    },

    rules: {
      'prefer-rest-params': 'off',
      'no-empty-function': 'off',
      'no-console': 0,
      'no-debugger': 0,

      'prettier/prettier': [
        'error',
        {
          trailingComma: 'all',
          tabWidth: 2,
          semi: false,
          singleQuote: true,
          bracketSpacing: true,
          eslintIntegration: true,
          printWidth: 120,
          endOfLine: 'auto',
          plugins: ['prettier-plugin-tailwindcss'],
        },
      ],
    },
  },
]
