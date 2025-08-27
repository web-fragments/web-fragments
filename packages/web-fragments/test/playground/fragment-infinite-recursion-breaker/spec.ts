import { test, expect } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

test('fragment infinite recursion breaker', async ({ page }) => {
	let lastError: Error;
	page.on('pageerror', async (error) => {
		lastError = error;
	});

	await page.goto('/fragment-infinite-recursion-breaker/');

	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF Playground: fragment-infinite-recursion-breaker');
		await expect(page.locator('h1')).toHaveText('WF Playground: fragment-infinite-recursion-breaker');
	});

	await step('fragment embedded in the initial html should init', async () => {
		const fragment = page.locator('web-fragment[fragment-id=fragment-infinite-recursion-breaker]');
		expect(fragment).toBeAttached();
		expect(await fragment.innerHTML()).toBe('');
		expect(lastError?.message).toBe(
			'Reframed IFrame init error!\n' +
				`IFrame loaded unexpected content for http://localhost:${new URL(page.url()).port}/fragment-infinite-recursion-breaker/!\n` +
				'Expected document title to be "Web Fragments: reframed" but was "WF Playground: fragment-infinite-recursion-breaker"\n' +
				'Ensure that the Web Fragment gateway contains a fragment registration with "routePatterns" matching path: /fragment-infinite-recursion-breaker/',
		);
	});
});
