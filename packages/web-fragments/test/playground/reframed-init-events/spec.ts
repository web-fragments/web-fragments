import { test, expect, Locator, Frame } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors, getFragmentContext } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

let fragment: Locator;
let fragmentContext: Frame;

beforeEach(async ({ page, browserName }) => {
	await page.goto('/reframed-init-events/');
	// wait for the fragment to load
	await page.waitForSelector('web-fragment h2');

	fragment = page.locator('web-fragment');
	fragmentContext = await getFragmentContext(fragment);
});

test('reframed: init events', async ({ page }) => {
	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF Playground: reframed-init-events');
		await expect(page.locator('h1')).toHaveText('WF Playground: reframed-init-events');
	});

	const checkboxes = await page.locator('input[type=checkbox]').all();

	//3 in shell app, 3 in fragment
	expect(checkboxes.length).toBe(6);

	for (const checkbox of checkboxes) {
		await expect(checkbox).toBeChecked();
	}
});
