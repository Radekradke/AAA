import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

/**
 * Lint da Ficha Viva: pega erro de verdade (regras dos hooks, acessibilidade
 * básica do JSX, código suspeito). O que é só estilo fica com o editor.
 */
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'test-results', 'playwright-report', 'public', 'zz-*'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...jsxA11y.flatConfigs.recommended.rules,
      // janelas e campos de busca focam o primeiro campo de propósito
      'jsx-a11y/no-autofocus': 'off',
      // <label> envolvendo o campo (nativo ou o MentionInput do diário) já associa
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either', controlComponents: ['MentionInput'], depth: 3 }],
      // "_nome" = descartado de propósito (desestruturação para tirar um campo)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
    },
  },
);
