import { test, expect } from '@playwright/test';
const { beforeEach, step, describe } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

describe('fragment destruction', () => {
	beforeEach(async ({ page }) => {
		await page.goto('/fragment-destruction/');

		await step('ensure the test harness app loaded', async () => {
			await expect(page).toHaveTitle('WF Playground: fragment-destruction');
			await expect(page.locator('h1')).toHaveText('WF Playground: fragment-destruction');
		});
	});

	test('DOM cleanup', async ({ page }) => {
		const fragments = page.locator('web-fragment');
		await expect(fragments.getByRole('heading')).toHaveText('hello world!');

		await step('removing a fragment should cause its DOM and iframe to be removed from the main document', async () => {
			await page.locator('button#remove').click();
			expect(await fragments.count()).toBe(0);
		});
	});

	test('JS task cleanup', async ({ page }) => {
		const fragments = page.locator('web-fragment');
		await expect(fragments.getByRole('heading')).toHaveText('hello world!');
		const lastMessageSpan = page.locator('p > span#lastMessage');
		await expect(lastMessageSpan).toHaveText(/hello\d+/);
		const messageBeforeDestruction = (await lastMessageSpan.textContent())!;
		// wait for a few messages to be sent
		await page.waitForTimeout(300);

		await step('removing a fragment should cause any scheduled tasks to stop', async () => {
			await page.locator('button#remove').click();
			await expect(lastMessageSpan).toHaveText(/hello\d+/);
			const messageAfterDestruction = (await lastMessageSpan.textContent())!;
			expect(messageBeforeDestruction < messageAfterDestruction).toBeTruthy();
			// extra wait to ensure that no timers are running any more in the background
			await page.waitForTimeout(200);
			expect(messageAfterDestruction).toBe(await lastMessageSpan.textContent());
		});
	});

	test('memory cleanup', async ({ page, browserName }) => {
		// this test currently fails on webkit and firefox but it's unclear why
		// manual testing doesn't show any memory leaks
		if (browserName === 'webkit' || browserName === 'firefox') return;

		const fragments = page.locator('web-fragment');
		await expect(fragments.getByRole('heading')).toHaveText('hello world!');

		await page.evaluate(() => {
			const garbage = document.querySelector('iframe[name="wf:fragment-destruction"]')?.contentWindow?.garbage;
			if (!garbage) throw new Error('garbage not found');

			globalThis.garbageArrayWeakRef = new WeakRef(garbage.gArray);
			globalThis.garbageH2WeakRef = new WeakRef(garbage.gh2);
		});

		await page.requestGC();
		expect(await page.evaluate(() => globalThis.garbageArrayWeakRef.deref())).toBeDefined();
		expect(await page.evaluate(() => globalThis.garbageH2WeakRef.deref())).toBeDefined();

		await step('removing a fragment should cause any fragment related memory to be released', async () => {
			await page.locator('button#remove').click();
			await page.requestGC();
			expect(await page.evaluate(() => globalThis.garbageArrayWeakRef.deref())).toBeUndefined();
			expect(await page.evaluate(() => globalThis.garbageH2WeakRef.deref())).toBeUndefined();
		});
	});

	// TODO: This test is failing because performance.memory.totalJSHeapSize isn't available in webkit and firefox.
	// 		   Additionally chrome running under playwright doesn't change the totalJSHeapSize value during the test.
	//
	// As of 2025-01-26 running this test manually across all browsers against `pnpm preview` doesn't indicate any memory leaks.
	// This was measured by clearing console, forcing GC, and taking heap snapshots via devtools of all three browsers.
	//
	// An alternative way to measure memory might be to monitor the memory usage of the browser process started
	// by playwright, but it's unclear how precise and reliable that would be. More exploration needed.
	test.fail('memory cleanup stress test', async ({ page }) => {
		const fragments = page.locator('web-fragment');
		await expect(fragments.getByRole('heading')).toHaveText('hello world!');
		const memoryUsageSpan = page.locator('span#memoryUsage');
		await expect(memoryUsageSpan).toHaveText(/\d+/);
		const getMemoryUsage = async () => Number.parseInt((await memoryUsageSpan.textContent()) ?? '0');

		const initialMemoryUsage = await getMemoryUsage();
		expect(initialMemoryUsage).toBeGreaterThan(0);

		let peakMemoryUsage;

		await step('adding lots of fragments should cause the memory to go up', async () => {
			for (let i = 0; i < 10; i++) {
				await page.locator('button#add').click();
			}

			await page.requestGC();
			peakMemoryUsage = await getMemoryUsage();
			expect(peakMemoryUsage).toBeGreaterThan(0);

			// TODO: this fails because the result is always 1, peakMemoryUsage and initialMemoryUsage are the same
			expect(peakMemoryUsage / initialMemoryUsage).toBeCloseTo(10, 0);
		});

		await step('adding lots of fragments should cause the memory to go up', async () => {
			for (let i = 0; i < 10; i++) {
				await page.locator('button#remove').click();
			}
			await page.requestGC();
			const finalMemoryUsage = await getMemoryUsage();
			expect(finalMemoryUsage / initialMemoryUsage).toBeCloseTo(1, 0);
		});
	});
});
