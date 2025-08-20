// @ts-check

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
	// Base configuration for all files
	//eslint.configs.recommended,
	tseslint.configs.recommended,

	// Playwright-specific configuration for test files
	{
		files: ['**/spec.ts'],
		plugins: {
			playwright,
		},
		rules: {
			'playwright/missing-playwright-await': 'error',
			...playwright.configs['flat/recommended'].rules,
			// Playwright-specific customizations
			'playwright/expect-expect': 'error',
			'playwright/max-nested-describe': ['error', { max: 3 }],
			'playwright/no-conditional-in-test': 'error',
			'playwright/no-nested-step': 'error',
			'playwright/no-networkidle': 'warn',
			'playwright/no-page-pause': 'error',
			'playwright/no-skipped-test': 'warn',
			'playwright/no-useless-await': 'error',
			'playwright/prefer-web-first-assertions': 'error',
			// TODO: consider enabling this rule and restructuring the tests
			'playwright/require-top-level-describe': 'off',
			'playwright/valid-expect': 'error',
		},
	},
);
