import { test, expect, Locator } from '@playwright/test';
const { beforeEach, step, describe } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

describe('script loading in fragments', () => {
	let fragment: Locator;

	beforeEach(async ({ page }) => {
		await page.goto('/script-loading/');
		fragment = page.locator('web-fragment');

		step('ensure the script-loading fragment renders', async () => {
			await expect(fragment.locator('h2')).toHaveText('script-loading fragment');
		});
		// TODO: is there a better way to wait for the fragment to load?
		// The app has lots of async scripts, so it's unclear how to wait for them all.
		// eslint-disable-next-line playwright/no-wait-for-timeout
		await page.waitForTimeout(1000);
	});

	test('ensure the test harness app loaded', async ({ page }) => {
		await expect(page).toHaveTitle('WF Playground: script-loading');
		await expect(page.locator('h1')).toHaveText('WF Playground: script-loading');
	});

	test('ensure that inline sync scripts executed correctly', async () => {
		await expect(fragment.locator('#inline-script-sync-running')).toBeChecked();
		await expect(fragment.locator('#inline-script-sync-reframed')).toBeChecked();
		await expect(fragment.locator('#inline-script-sync-currentScript')).toBeChecked();
	});

	test('ensure that inline async scripts executed correctly', async () => {
		await expect(fragment.locator('#inline-script-async-running')).toBeChecked();
		await expect(fragment.locator('#inline-script-async-reframed')).toBeChecked();
		await expect(fragment.locator('#inline-script-async-currentScript')).toBeChecked();
	});

	test('ensure that inline module scripts executed correctly', async () => {
		await expect(fragment.locator('#inline-script-module-running')).toBeChecked();
		await expect(fragment.locator('#inline-script-module-reframed')).toBeChecked();
	});

	test('ensure that external sync scripts executed correctly', async () => {
		await expect(fragment.locator('#external-script-sync-running')).toBeChecked();
		await expect(fragment.locator('#external-script-sync-reframed')).toBeChecked();
		await expect(fragment.locator('#external-script-sync-currentScript')).toBeChecked();
	});

	test('ensure that external async scripts executed correctly', async () => {
		await expect(fragment.locator('#external-script-async-running')).toBeChecked();
		await expect(fragment.locator('#external-script-async-reframed')).toBeChecked();
		await expect(fragment.locator('#external-script-async-currentScript')).toBeChecked();
	});

	test('ensure that external defer scripts executed correctly', async () => {
		await expect(fragment.locator('#external-script-defer-running')).toBeChecked();
		await expect(fragment.locator('#external-script-defer-reframed')).toBeChecked();
		await expect(fragment.locator('#external-script-defer-currentScript')).toBeChecked();
	});

	test('ensure that external module scripts executed correctly', async () => {
		await expect(fragment.locator('#external-script-module-running')).toBeChecked();
		await expect(fragment.locator('#external-script-module-reframed')).toBeChecked();
	});

	test('ensure that child inline scripts executed correctly', async () => {
		await expect(fragment.locator('#inline-child-script-sync-running')).toBeChecked();
		await expect(fragment.locator('#inline-child-script-sync-reframed')).toBeChecked();
		await expect(fragment.locator('#inline-child-script-sync-currentScript')).toBeChecked();
	});

	test('ensure that child external scripts executed correctly', async () => {
		await expect(fragment.locator('#external-child-script-sync-running')).toBeChecked();
		await expect(fragment.locator('#external-child-script-sync-reframed')).toBeChecked();
		await expect(fragment.locator('#external-child-script-sync-currentScript')).toBeChecked();
	});

	test(`ensure all script loaded in fragment's JS context and not in the main context`, async ({ page }) => {
		const frame = page.frame({ name: 'wf:script-loading' });
		expect(frame).not.toBe(null);
		expect(await frame?.evaluate(() => window.name)).toBe('wf:script-loading');
		expect(await frame?.evaluate(() => window.SCRIPT_COUNTER)).toBe(9); // 3 inline, 4 external, 2 child scripts
		expect(await page?.evaluate(() => window.SCRIPT_COUNTER)).toBe(undefined);
	});

	test('ensure that preload and prefix links executed correctly', async ({ browserName }) => {
		await expect(fragment.locator('#link-preload-loaded')).toBeChecked();
		await expect(fragment.locator('#link-preload-reframed')).toBeChecked();
		await expect(fragment.locator('#link-preload-inert')).toBeChecked();

		// For an unknown reason, the prefetch tests are flaky on webkit and firefox
		// eslint-disable-next-line playwright/no-conditional-in-test
		if (browserName !== 'webkit' && browserName !== 'firefox') {
			// eslint-disable-next-line playwright/no-conditional-expect
			await expect(fragment.locator('#link-prefetch-loaded')).toBeChecked();
			// eslint-disable-next-line playwright/no-conditional-expect
			await expect(fragment.locator('#link-prefetch-reframed')).toBeChecked();
			// eslint-disable-next-line playwright/no-conditional-expect
			await expect(fragment.locator('#link-prefetch-inert')).toBeChecked();
		}

		await expect(fragment.locator('#link-modulepreload-loaded')).toBeChecked();
		await expect(fragment.locator('#link-modulepreload-reframed')).toBeChecked();
		await expect(fragment.locator('#link-modulepreload-inert')).toBeChecked();

		await expect(fragment.locator('#link-dynamic-append-loaded')).toBeChecked();
		await expect(fragment.locator('#link-dynamic-append-reframed')).toBeChecked();
		await expect(fragment.locator('#link-dynamic-append-inert')).toBeChecked();

		await expect(fragment.locator('#link-dynamic-insertAdjacent-loaded')).toBeChecked();
		await expect(fragment.locator('#link-dynamic-insertAdjacent-reframed')).toBeChecked();
		await expect(fragment.locator('#link-dynamic-insertAdjacent-inert')).toBeChecked();
	});
});
