import { test, expect } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors, getFragmentContext } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

test('script isolation of fragments', async ({ page }) => {
	await page.goto('/script-isolation/');

	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF TestBed: script-isolation');
		await expect(page.locator('h1')).toHaveText('WF TestBed: script-isolation');
	});

	await step('ensure that the host app has its own dedicated JS context', async () => {
		await expect(await page.evaluate(() => window.SCRIPT_ISOLATION_MARKER)).toBe(undefined);
	});

	const fragmentA1 = page.locator('fragment-host[src="/script-isolation/fragment-a"]').first();
	const contextA1 = await getFragmentContext(fragmentA1);

	await step('ensure that the first fragment A has its own dedicated JS context', async () => {
		await expect(fragmentA1.locator('p')).toHaveText('Document Title: script-isolation fragment A');
		await expect(await contextA1.evaluate(() => window.SCRIPT_ISOLATION_MARKER)).toMatch(/🅰 0.\d+/);
	});

	const fragmentB = page.locator('fragment-host[src="/script-isolation/fragment-b"]');
	const contextB = await getFragmentContext(fragmentB);

	await step('ensure that the fragment B has its own dedicated JS context', async () => {
		await expect(fragmentB.locator('p')).toHaveText('Document Title: script-isolation fragment B');
		await expect(await contextB.evaluate(() => window.SCRIPT_ISOLATION_MARKER)).toBe('🅱');
	});

	const fragmentA2 = page.locator('fragment-host[src="/script-isolation/fragment-a"]').last()!;
	const contextA2 = await getFragmentContext(fragmentA2);

	await step('ensure that the second fragment A has its own dedicated JS context', async () => {
		await expect(fragmentA1.locator('p')).toHaveText('Document Title: script-isolation fragment A');
		await expect(await contextA2.evaluate(() => window.SCRIPT_ISOLATION_MARKER)).toMatch(/🅰 0.\d+/);

		const markerA1 = await contextA1.evaluate(() => window.SCRIPT_ISOLATION_MARKER);
		const markerA2 = await contextA2.evaluate(() => window.SCRIPT_ISOLATION_MARKER);
		await expect(markerA1).not.toBe(markerA2);
	});
});
