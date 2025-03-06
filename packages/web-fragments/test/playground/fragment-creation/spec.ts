import { test, expect } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

test('fragment creation', async ({ page }) => {
	await page.goto('/fragment-creation/');

	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF Playground: fragment-creation');
		await expect(page.locator('h1')).toHaveText('WF Playground: fragment-creation');
	});

	await step('fragment embedded in the initial html should init', async () => {
		const fragment = page.locator('web-fragment[fragment-id=fragment-creation]');
		await expect(fragment.getByRole('heading')).toHaveText('hello world!');
	});

	await step('fragment created via document.createElement should init', async () => {
		const fragment = page.locator('web-fragment[fragment-id=fragment-creation2]');
		await expect(fragment.getByRole('heading')).toHaveText('hello world!');
	});

	await step('fragment created via `new FragmentHost()` should init', async () => {
		const fragment = page.locator('web-fragment[fragment-id=fragment-creation3]');
		await expect(fragment.getByRole('heading')).toHaveText('hello world!');
	});

	await step('fragment can be parameterized via query params in fragment[src]', async () => {
		const fragment = page.locator('web-fragment[fragment-id=fragment-creation4]');
		await expect(await fragment.getAttribute('src')).toBe('/fragment-creation/fragment?name=Natalia');
		await expect(fragment.getByRole('heading')).toHaveText('hello Natalia!');
	});
});

test('fragment initialization', async ({ page }) => {
	await page.goto('/fragment-creation/');

	await step('web-fragments should render good css defaults: display:block and position:relative', async () => {
		const fragment = page.locator('web-fragment[fragment-id=fragment-creation]');
		await expect(fragment).toHaveCSS('display', 'block');
		await expect(fragment).toHaveCSS('position', 'relative');
	});

	await step('fragment should have a shadow root which contains fragment host', async () => {
		const fragment = page.locator('web-fragment[fragment-id=fragment-creation]');
		await expect(await fragment.evaluate((fragment) => fragment.shadowRoot!.firstElementChild!.tagName)).toBe(
			'WEB-FRAGMENT-HOST',
		);
	});

	await step(`fragment's iframe should have it's name set to fragment-id`, async () => {
		const fragment = page.locator('web-fragment[fragment-id=fragment-creation]');
		await expect(await fragment.locator('h2')).toBeVisible();
		const fragmentIframe = page.locator('iframe[name=fragment-creation]');
		await expect(await fragmentIframe).toBeAttached();

		const fragment4 = page.locator('web-fragment[fragment-id=fragment-creation4]');
		await expect(await fragment4.locator('h2')).toBeVisible();
		const fragmentIframe4 = page.locator('iframe[name=fragment-creation4]');
		await expect(await fragmentIframe4).toBeAttached();
	});
});
