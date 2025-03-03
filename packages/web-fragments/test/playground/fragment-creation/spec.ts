import { test, expect } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

test('fragment creation', async ({ page }) => {
	await page.goto('/fragment-creation/');

	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF TestBed: fragment-creation');
		await expect(page.locator('h1')).toHaveText('WF TestBed: fragment-creation');
	});

	await step('fragment embedded in the initial html should init', async () => {
		const fragment = page.locator('fragment-host').first();
		await expect(fragment.getByRole('heading')).toHaveText('hello world!');
	});

	await step('fragment created via document.createElement should init', async () => {
		const fragment = page.locator('fragment-host#fragment2');
		await expect(fragment.getByRole('heading')).toHaveText('hello world!');
	});

	await step('fragment created via `new FragmentHost()` should init', async () => {
		const fragment = page.locator('fragment-host#fragment3');
		await expect(fragment.getByRole('heading')).toHaveText('hello world!');
	});

	// TODO: enable when we support standalone fragments
	// await step('fragment can be parameterized via query params in fragment[src]', async () => {
	// 	const fragment = page.locator('fragment-host#fragment4');
	// 	await expect(await fragment.getAttribute('src')).toBe('/fragment-creation/fragment?name=Natalia');
	// 	await expect(fragment.getByRole('heading')).toHaveText('hello Natalia!');
	// });
});

test('fragment initialization', async ({ page }) => {
	await page.goto('/fragment-creation/');

	await step('fragment-hosts should render good css defaults: display:block and position:relative', async () => {
		const fragment = page.locator('fragment-host').first();
		await expect(fragment).toHaveCSS('display', 'block');
		await expect(fragment).toHaveCSS('position', 'relative');
	});
});

// TODO none of this is supported yet
// 	await step('fragment src should be set as both attribute and property', async () => {
// 		const fragment = page.locator('fragment-host').first();
// 		await expect(fragment).toHaveAttribute('src', '/fragment-creation/fragment');
// 		await expect(fragment).toHaveJSProperty('src', '/fragment-creation/fragment');
// 	});
// });

// test('fragment src immutability', async ({ page }) => {
// 	await page.goto('/fragment-creation/');

// 	await step('fragment src modification should throw', async () => {
// 		const fragment = page.locator('fragment-host').first();
// 		await expect(fragment.evaluate((el) => (el.src = 'foo'))).rejects.toThrow();
// 	});
// });
