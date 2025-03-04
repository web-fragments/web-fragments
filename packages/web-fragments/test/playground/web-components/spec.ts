import { test, expect } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

test('script loading in fragments', async ({ page }) => {
	await page.goto('/web-components/');

	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF Playground: web-components');
		await expect(page.locator('h1')).toHaveText('WF Playground: web-components');
	});

	await step('ensure a web component in the main document works', async () => {
		await expect(page.locator('test-component').first()).toHaveText('hello from main');
	});

	const fragment1 = page.locator('fragment-host').nth(0);
	const fragment2 = page.locator('fragment-host').nth(1);

	await step('ensure the first fragment loaded with custom elements', async () => {
		// TODO: this expectation is wrong, but we have it here to document the current behavior
		// The first element is instantiated by the browser because it's found in the DOM.
		// We currently can't override it, so we get it from main.
		await expect(fragment1.locator('test-component').nth(0)).toHaveText('hello from main');
		// the second element is created via document.createElement and we get it correctly from the fragment context
		await expect(fragment1.locator('test-component').nth(1)).toHaveText(/hello from fragment 0\.\d+/);
	});

	await step('ensure the second fragment loaded with custom elements', async () => {
		// TODO: this expectation is wrong, but we have it here to document the current behavior
		// The first element is instantiated by the browser because it's found in the DOM.
		// We currently can't override it, so we get it from main.
		await expect(fragment2.locator('test-component').nth(0)).toHaveText('hello from main');
		// the second element is created via document.createElement and we get it correctly from the fragment context
		await expect(fragment2.locator('test-component').nth(1)).toHaveText(/hello from fragment 0\.\d+/);
		// since the two fragments are isolated from each other, they should have unique instances of the custom element
		await expect(fragment2.locator('test-component').nth(1)).not.toHaveText(
			await fragment1.locator('test-component').nth(1).innerText(),
		);
	});
});
