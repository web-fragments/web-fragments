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
		const fragment = page.locator('web-fragment').first();
		await expect(fragment.getByRole('heading')).toHaveText('hello world!');
	});

	await step('fragment created via document.createElement should init', async () => {
		const fragment = page.locator('web-fragment#fragment2');
		await expect(fragment.getByRole('heading')).toHaveText('hello world!');
	});

	await step('fragment created via `new FragmentHost()` should init', async () => {
		const fragment = page.locator('web-fragment#fragment3');
		await expect(fragment.getByRole('heading')).toHaveText('hello world!');
	});

	await step('fragment can be parameterized via query params in fragment[src]', async () => {
		const fragment = page.locator('web-fragment#fragment4');
		await expect(await fragment.getAttribute('src')).toBe('/fragment-creation/fragment?name=Natalia');
		await expect(fragment.getByRole('heading')).toHaveText('hello Natalia!');
	});
});

test('fragment initialization', async ({ page }) => {
	await page.goto('/fragment-creation/');

	await step('web-fragments should render good css defaults: display:block and position:relative', async () => {
		const fragment = page.locator('web-fragment').first();
		await expect(fragment).toHaveCSS('display', 'block');
		await expect(fragment).toHaveCSS('position', 'relative');
	});

	await step('fragment should have a shadow root which contains fragment host', async () => {
		const fragment = page.locator('web-fragment').first();
		await expect(await fragment.evaluate((fragment) => fragment.shadowRoot!.firstElementChild!.tagName)).toBe(
			'WEB-FRAGMENT-HOST',
		);
	});
});
