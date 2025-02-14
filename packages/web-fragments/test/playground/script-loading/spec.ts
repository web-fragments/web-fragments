import { test, expect } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

test('script loading in fragments', async ({ page }) => {
	await page.goto('/script-loading/');

	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF Playground: script-loading');
		await expect(page.locator('h1')).toHaveText('WF Playground: script-loading');
	});

	const fragment = page.locator('web-fragment');

	await step('ensure the script-loading fragment renders', async () => {
		await expect(fragment.locator('h2')).toHaveText('script-loading fragment');
	});

	await step('ensure that inline sync scripts executed correctly', async () => {
		await expect(fragment.locator('#inline-script-sync-running')).toBeChecked();
		await expect(fragment.locator('#inline-script-sync-reframed')).toBeChecked();
	});

	await step('ensure that inline async scripts executed correctly', async () => {
		await expect(fragment.locator('#inline-script-async-running')).toBeChecked();
		await expect(fragment.locator('#inline-script-async-reframed')).toBeChecked();
	});

	await step('ensure that inline module scripts executed correctly', async () => {
		await expect(fragment.locator('#inline-script-module-running')).toBeChecked();
		await expect(fragment.locator('#inline-script-module-reframed')).toBeChecked();
	});

	await step('ensure that external sync scripts executed correctly', async () => {
		await expect(fragment.locator('#external-script-sync-running')).toBeChecked();
		await expect(fragment.locator('#external-script-sync-reframed')).toBeChecked();
	});

	await step('ensure that external async scripts executed correctly', async () => {
		await expect(fragment.locator('#external-script-async-running')).toBeChecked();
		await expect(fragment.locator('#external-script-async-reframed')).toBeChecked();
	});

	await step('ensure that external defer scripts executed correctly', async () => {
		await expect(fragment.locator('#external-script-defer-running')).toBeChecked();
		await expect(fragment.locator('#external-script-defer-reframed')).toBeChecked();
	});

	await step('ensure that external module scripts executed correctly', async () => {
		await expect(fragment.locator('#external-script-module-running')).toBeChecked();
		await expect(fragment.locator('#external-script-module-reframed')).toBeChecked();
	});

	await step('ensure all script loaded in a JS context different from the main context', async () => {
		// TODO: replace with `frame({name: ...})` once we correctly set frame names.
		const frame = await page.frames()[1];
		expect(frame).not.toBe(null);
		expect(await frame?.evaluate(() => window.SCRIPT_CONTEXT_MARKER)).toBe('🔥');
		expect(await page.evaluate(() => window.SCRIPT_CONTEXT_MARKER)).toBe(undefined);
		expect(await frame?.evaluate(() => window.SCRIPT_COUNTER)).toBe(7);
	});
});
