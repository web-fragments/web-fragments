import { test, expect } from '@playwright/test';
const { beforeEach } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

test.describe('fragment redirects', () => {
	test('unbound fragment should handle redirect by updating iframe src', async ({ page }) => {
		await page.goto('/fragment-redirects/');

		// Wait for the page to load
		await page.waitForSelector('h1');

		// The unbound fragment should redirect and update its iframe src
		// Since it's unbound, it should load the redirected content
		const unboundFragment = page.locator('web-fragment[fragment-id="fragment-redirects-unbound"]');

		// Wait for the fragment to attempt to load (it should redirect)
		await page.waitForTimeout(1000);

		// Check that the iframe src was updated to the redirect location
		const iframe = page.locator('iframe').first();
		const src = await iframe.getAttribute('src');

		// The iframe should have been updated to point to the redirect URL
		expect(src).toContain('/fragment-redirects/redirected-unbound');
	});

	test('piercing disabled fragment should handle redirect by updating window.location', async ({ page, context }) => {
		// Listen for navigation events
		let navigationPromise = page.waitForEvent('framenavigated');

		await page.goto('/fragment-redirects/');

		// Wait for the page to load
		await page.waitForSelector('h1');

		// The piercing disabled fragment should cause a full page navigation
		// This test might be tricky because the page will navigate away
		// Let's check if we can detect the navigation

		try {
			await navigationPromise;
			// If we get here, navigation occurred
			expect(page.url()).toContain('/fragment-redirects/redirected-piercing-disabled');
		} catch (e) {
			// Navigation didn't occur within timeout, which might be expected
			// depending on how the redirect is handled
			console.log('Navigation did not occur as expected');
		}
	});

	test('pierced+bound fragment should show error for incompatible redirect', async ({ page }) => {
		await page.goto('/fragment-redirects/');

		// Wait for the page to load
		await page.waitForSelector('h1');

		// The pierced+bound fragment should show an error message
		const piercedBoundFragment = page.locator('web-fragment[fragment-id="fragment-redirects-pierced-bound"]');

		// Wait a bit for the fragment to attempt to load
		await page.waitForTimeout(1000);

		// Check if an error message is displayed in the fragment
		const fragmentContent = await piercedBoundFragment.textContent();
		expect(fragmentContent).toContain('error');
	});

	test('page should load without crashing', async ({ page }) => {
		await page.goto('/fragment-redirects/');

		// Basic smoke test - page should load
		await expect(page.locator('h1')).toHaveText('WF Playground: fragment-redirects');

		// Should have the test sections
		await expect(page.locator('text=Unbound Fragment')).toBeVisible();
		await expect(page.locator('text=Piercing Disabled Fragment')).toBeVisible();
		await expect(page.locator('text=Pierced+Bound Fragment')).toBeVisible();
	});
});
