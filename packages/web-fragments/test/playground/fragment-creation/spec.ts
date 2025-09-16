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
		await expect(fragment).toHaveAttribute('src', '/fragment-creation/fragment?name=Natalia');
		await expect(fragment.getByRole('heading')).toHaveText('hello Natalia!');
	});
});

test('fragment initialization', async ({ page }) => {
	await page.goto('/fragment-creation/');

	await step('web-fragments should render good css defaults: display:block and position:static', async () => {
		const fragment = page.locator('web-fragment[fragment-id=fragment-creation]');
		await expect(fragment).toHaveCSS('display', 'block');
		await expect(fragment).toHaveCSS('position', 'static');

		const wfDocument = page.locator('web-fragment[fragment-id=fragment-creation] wf-document');
		await expect(wfDocument).toHaveCSS('display', 'block');
		await expect(wfDocument).toHaveCSS('position', 'static');

		const wfHtml = page.locator('web-fragment[fragment-id=fragment-creation] wf-html');
		await expect(wfHtml).toHaveCSS('display', 'block');
		await expect(wfHtml).toHaveCSS('position', 'static');

		const wfHead = page.locator('web-fragment[fragment-id=fragment-creation] wf-head');
		await expect(wfHead).toHaveCSS('display', 'none');

		const wfBody = page.locator('web-fragment[fragment-id=fragment-creation] wf-body');
		await expect(wfBody).toHaveCSS('display', 'block');
		await expect(wfBody).toHaveCSS('position', 'static');
	});

	await step('fragment should have a shadow root which contains fragment host', async () => {
		const fragment = page.locator('web-fragment[fragment-id=fragment-creation]');
		expect(await fragment.evaluate((fragment) => fragment.shadowRoot!.firstElementChild!.tagName)).toBe(
			'WEB-FRAGMENT-HOST',
		);
	});

	await step(`fragment's iframe should have it's name set to fragment-id`, async () => {
		const fragment = page.locator('web-fragment[fragment-id=fragment-creation]');
		await expect(fragment.locator('h2')).toBeVisible();
		const fragmentIframe = page.locator('iframe[name="wf:fragment-creation"]');
		await expect(await fragmentIframe).toBeAttached();

		const fragment4 = page.locator('web-fragment[fragment-id=fragment-creation4]');
		await expect(fragment4.locator('h2')).toBeVisible();
		const fragmentIframe4 = page.locator('iframe[name="wf:fragment-creation4"]');
		await expect(await fragmentIframe4).toBeAttached();
	});
});
