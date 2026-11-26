/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
	{
		ignores: ['@vite', 'build', 'dist'],
	},
	{
		files: ['**/*.{js,jsx}'],
		languageOptions: {
			ecmaVersion: 'latest',
			globals: {
				...globals.browser,
				Liferay: 'readonly',
			},
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
			sourceType: 'module',
		},
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
		},
		rules: {
			...js.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			'no-unused-vars': ['error', {varsIgnorePattern: '^[A-Z_]'}],
			'react-refresh/only-export-components': [
				'warn',
				{allowConstantExport: true},
			],
		},
	},
	...tseslint.configs.recommended.map((config) => ({
		...config,
		files: ['**/*.{ts,tsx}'],
	})),
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			globals: globals.browser,
		},
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{argsIgnorePattern: '^_'},
			],
			'react-refresh/only-export-components': [
				'warn',
				{allowConstantExport: true},
			],
		},
	},
	{
		files: ['*.config.{js,ts}'],
		languageOptions: {
			globals: globals.node,
		},
	},
];
