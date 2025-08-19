import { test, expect } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

test('fragment with iframe delivered with the x-frame-options=deny response header should fail gracefully', async ({
	page,
}) => {
	let lastError: Error;
	page.on('pageerror', async (error) => {
		lastError = error;
	});

	await page.goto('/fragment-x-frame-options-deny/');

	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF Playground: fragment-x-frame-options-deny');
		await expect(page.locator('h1')).toHaveText('WF Playground: fragment-x-frame-options-deny');
	});

	await step('fragment should forcefully fail when x-frame-options=deny is set', async () => {
		const fragment = page.locator('web-fragment[fragment-id=fragment-x-frame-options-deny]');
		await expect(fragment).toBeAttached();
		expect(await fragment.innerHTML()).toBe('');
		expect(lastError?.message).toBe(
			'Reframed IFrame init error!\n' +
				`IFrame loaded unexpected content for http://localhost:${new URL(page.url()).port}/fragment-x-frame-options-deny/!\n` +
				'Expected document title to be "Web Fragments: reframed" but was "undefined"\n' +
				'Ensure that the Web Fragment gateway contains a fragment registration with "routePatterns" matching path: /fragment-x-frame-options-deny/\n' +
				'Additionally, ensure that the iframe response is not delivered with the "X-Frame-Options" response header set to "deny".',
		);
	});
});
