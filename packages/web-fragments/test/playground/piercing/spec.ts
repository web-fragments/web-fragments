import { test, expect, Locator, Frame } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors, getFragmentContext } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

let fragment: Locator;
let fragmentContext: Frame;

if (process.env.PIERCING === 'true') {
	// Only run these tests if piercing is enabled
	// All of these tests assume that the host was pierced.

	beforeEach(async ({ page }) => {
		await page.goto('/piercing/');
		// wait for the fragment to load
		// we use web-fragment-host because piercing needs to be triggered manually in this test
		await page.waitForSelector('web-fragment-host h2');

		// we use web-fragment-host because piercing needs to be triggered manually in this test
		fragment = page.locator('web-fragment-host');
		fragmentContext = await getFragmentContext(fragment);
	});

	test('should pierced the fragment', async ({ page }) => {
		expect(await fragmentContext.evaluate(`document.querySelector('h2').textContent`)).toBe('Piercing style tests!');
	});
}
