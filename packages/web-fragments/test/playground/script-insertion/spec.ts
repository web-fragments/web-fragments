import { test, expect } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

test('DOM querying in fragments', async ({ page }) => {
	await page.goto('/script-insertion/');

	await step('ensure the test harness app loaded', async () => {
		await expect(page.locator('h1')).toHaveText('WF Playground: Inert script evaluation');
	});

	const fragment = page.locator('web-fragment-host');

	await step('ensure counter script is only evaluated once', async () => {
		await expect(fragment.locator('#script-counter-checkbox')).toBeChecked();
	});
});
