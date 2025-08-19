import { test, expect } from '@playwright/test';
const { beforeEach, describe, step } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

describe('fragment Content Security Policy (CSP)', () => {
	let lastError: Error;

	beforeEach(async ({ page }) => {
		await page.goto('/fragment-csp/');

		page.on('pageerror', async (error) => {
			lastError = error;
		});

		await step('ensure the test harness app loaded', async () => {
			await expect(page).toHaveTitle('WF Playground: fragment-csp');
			await expect(page.locator('h1')).toHaveText('WF Playground: fragment-csp');
		});
	});

	test(`triggering eval() from the host app should work since the host app's CSP allows it`, async ({ page }) => {
		let alertFired = false;

		page.on('dialog', (dialog) => {
			alertFired = true;
			dialog.accept();
		});

		const button = page.locator('button#host-eval-button');
		await button.click();
		expect(alertFired).toBe(true);
	});

	test(`triggering eval() from the fragment app should FAIL since the fragment app's CSP disallows it`, async ({
		page,
	}) => {
		let alertFired = false;

		page.on('dialog', (dialog) => {
			alertFired = true;
			dialog.accept();
		});

		const button = page.locator('button#fragment-eval-button');
		await button.click();
		expect(alertFired).toBe(false);
		expect(lastError).toBeUndefined();
	});
});
