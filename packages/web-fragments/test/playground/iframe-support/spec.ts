import { test, expect } from '@playwright/test';
const { beforeEach, describe, step } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

describe('fragment support for nested iframes', () => {
	beforeEach(async ({ page }) => {
		await page.goto('/iframe-support/');

		await step('ensure the test harness app loaded', async () => {
			await expect(page).toHaveTitle('WF Playground: iframe-support');
			await expect(page.locator('h1')).toHaveText('WF Playground: iframe-support');
		});
	});

	test(`should support nested iframes`, async ({ page }) => {
		const checkboxes = await page.locator('input[type=checkbox]').all();

		//7 in shell app, 4 in fragment
		expect(checkboxes.length).toBe(10);

		for (const checkbox of checkboxes) {
			await expect(checkbox).toBeChecked();
		}
	});
});
