import { test, expect } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

test('dom isolation of fragments', async ({ page }) => {
	await page.goto('/dom-isolation/');

	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF Playground: dom-isolation');
		await expect(page.locator('h1')).toHaveText('WF Playground: dom-isolation');
	});

	const fragment = page.locator('web-fragment');

	await step('ensure the dom-isolation fragment renders', async () => {
		await expect(fragment.getByRole('heading')).toHaveText('dom-isolation fragment');
	});

	await step('styles within the fragment should be unaffected by outside styles', async () => {
		const red = 'rgb(255, 0, 0)';
		const blue = 'rgb(0, 0, 255)';
		await expect(fragment.getByText('This text should be red')).toHaveCSS('color', red);
		await expect(fragment.getByText('and blue')).toHaveCSS('color', blue);
		await expect(fragment.getByText('...')).toHaveCSS('color', red);
	});

	await step('styles outside the fragment should be unaffected by fragment styles', async () => {
		const green = 'rgb(0, 128, 0)';
		const pink = 'rgb(255, 192, 203)';
		await expect(page.getByText('This text should be green')).toHaveCSS('color', green);
		await expect(page.getByText('and pink')).toHaveCSS('color', pink);
		await expect(page.getByText('!!!')).toHaveCSS('color', green);
	});

	await step('the fragment should have an empty light dom', async () => {
		expect(await fragment.innerHTML()).toBe('');
		expect(await (await fragment.locator('web-fragment-host')).innerHTML()).toBe('');
	});

	await step('the fragment should have an open shadow root with content', async () => {
		expect(await fragment.evaluate((element) => element.shadowRoot?.firstElementChild?.shadowRoot?.nodeName)).toBe(
			'#document-fragment',
		);
		expect(
			await fragment.evaluate(
				(element) => element.shadowRoot?.firstElementChild?.shadowRoot?.querySelector('h2')?.innerText,
			),
		).toBe('dom-isolation fragment');
	});
});
