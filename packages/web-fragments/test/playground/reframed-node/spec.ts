import { test, expect, Locator, Frame } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors, getFragmentContext } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

let fragment: Locator;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let fragmentContext: Frame;

beforeEach(async ({ page }) => {
	await page.goto('/reframed-node/');

	fragment = page.locator('web-fragment');
	fragmentContext = await getFragmentContext(fragment);

	await expect(fragment.getByRole('heading')).toHaveText('reframed-node fragment');
});

test('reframed: node.ownerDocument', async ({ page }) => {
	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF Playground: reframed-node');
		await expect(page.locator('h1')).toHaveText('WF Playground: reframed-node');
	});

	const checkboxes = await page.locator('input[type=checkbox]').all();

	//7 in shell app, 4 in fragment
	expect(checkboxes.length).toBe(11);

	for (const checkbox of checkboxes) {
		await expect(checkbox).toBeChecked();
	}
});
