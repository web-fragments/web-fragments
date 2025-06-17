import { test, expect, Locator } from '@playwright/test';
const { beforeEach, step, describe } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

describe('data fetching in fragments', () => {
	let fragment: Locator;

	beforeEach(async ({ page }) => {
		await page.goto('/data-fetching/');
		fragment = page.locator('web-fragment');

		step('ensure the data-fetching fragment renders', async () => {
			await expect(fragment.locator('h2')).toHaveText('data-fetching fragment');
		});
	});

	test('ensure the test harness app loaded', async ({ page }) => {
		await expect(page).toHaveTitle('WF Playground: data-fetching');
		await expect(page.locator('h1')).toHaveText('WF Playground: data-fetching');
	});

	test('ensure that fetch requests from fragments have X-Web-Fragment-Id request header', async () => {
		await fragment.locator('#fetchButton').click();
		await expect(fragment.locator('#response')).toHaveText(/"x-web-fragment-id": "data-fetching"/);
	});
});
