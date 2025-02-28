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
		await expect(fragment.locator('#inline-script-sync-currentScript')).toBeChecked();
	});

	await step('ensure that inline async scripts executed correctly', async () => {
		await expect(fragment.locator('#inline-script-async-running')).toBeChecked();
		await expect(fragment.locator('#inline-script-async-reframed')).toBeChecked();
		await expect(fragment.locator('#inline-script-async-currentScript')).toBeChecked();
	});

	await step('ensure that inline module scripts executed correctly', async () => {
		await expect(fragment.locator('#inline-script-module-running')).toBeChecked();
		await expect(fragment.locator('#inline-script-module-reframed')).toBeChecked();
	});

	await step('ensure that external sync scripts executed correctly', async () => {
		await expect(fragment.locator('#external-script-sync-running')).toBeChecked();
		await expect(fragment.locator('#external-script-sync-reframed')).toBeChecked();
		await expect(fragment.locator('#external-script-sync-currentScript')).toBeChecked();
	});

	await step('ensure that external async scripts executed correctly', async () => {
		await expect(fragment.locator('#external-script-async-running')).toBeChecked();
		await expect(fragment.locator('#external-script-async-reframed')).toBeChecked();
		await expect(fragment.locator('#external-script-async-currentScript')).toBeChecked();
	});

	await step('ensure that external defer scripts executed correctly', async () => {
		await expect(fragment.locator('#external-script-defer-running')).toBeChecked();
		await expect(fragment.locator('#external-script-defer-reframed')).toBeChecked();
		await expect(fragment.locator('#external-script-defer-currentScript')).toBeChecked();
	});

	await step('ensure that external module scripts executed correctly', async () => {
		await expect(fragment.locator('#external-script-module-running')).toBeChecked();
		await expect(fragment.locator('#external-script-module-reframed')).toBeChecked();
	});

	await step('ensure that child inline scripts executed correctly', async () => {
		await expect(fragment.locator('#inline-child-script-sync-running')).toBeChecked();
		await expect(fragment.locator('#inline-child-script-sync-reframed')).toBeChecked();
		await expect(fragment.locator('#inline-child-script-sync-currentScript')).toBeChecked();
	});

	await step('ensure that child external scripts executed correctly', async () => {
		await expect(fragment.locator('#external-child-script-sync-running')).toBeChecked();
		await expect(fragment.locator('#external-child-script-sync-reframed')).toBeChecked();
		await expect(fragment.locator('#external-child-script-sync-currentScript')).toBeChecked();
	});

	await step(`ensure all script loaded in fragment's JS context and not in the main context`, async () => {
		const frame = await page.frame({ name: 'wf:script-loading' });
		expect(frame).not.toBe(null);
		expect(await frame?.evaluate(() => window.name)).toBe('wf:script-loading');
		expect(await frame?.evaluate(() => window.SCRIPT_COUNTER)).toBe(9); // 3 inline, 4 external, 2 child scripts
		expect(await page?.evaluate(() => window.SCRIPT_COUNTER)).toBe(undefined);
	});
});
