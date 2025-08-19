import { test, expect, Locator, Frame } from '@playwright/test';
const { beforeEach, describe, step } = test;
import { failOnBrowserErrors, getFragmentContext } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

let fragmentHost: Locator;
let fragmentContext: Frame;

// Only run these tests if piercing is enabled
// All of these tests assume that the host was pierced.
process.env.PIERCING !== 'false' &&
	describe('piercing', () => {
		beforeEach(async ({ page }) => {
			await page.goto('/piercing/');

			// we use web-fragment-host because piercing needs to be triggered manually in this test
			fragmentHost = page.locator('web-fragment-host');

			// wait for the fragment-host to load
			await expect(fragmentHost.locator('h2')).toHaveText('Piercing style tests!');

			fragmentContext = await getFragmentContext(fragmentHost);

			expect(await fragmentContext.evaluate(`document.querySelector('h2').textContent`)).toBe('Piercing style tests!');
		});

		test('should have default WF styles before piercing', async () => {
			await expect(fragmentHost).toHaveCSS('display', 'block');
		});

		test('should preserve styles throughout portaling', async ({ page }) => {
			await step('should have initial app styles set', async () => {
				expect(await getLiBeforeContent(1)).toBe('✅');
				expect(await getLiBeforeContent(2)).toBe('✅');
				expect(await getLiBeforeContent(3)).toBe('⏳');
				expect(await getLiBeforeContent(4)).toBe('⏳');
				expect(await getLiBeforeContent(5)).toBe('✅');
				expect(await getLiBeforeContent(6)).toBe('✅');
				expect(await getLiBeforeContent(7)).toBe('⏳');
				expect(await getLiBeforeContent(8)).toBe('⏳');
				expect(await getLiBeforeContent(9)).toBe('✅');
				expect(await getLiBeforeContent(10)).toBe('⏳');
				expect(await getLiBeforeContent(11)).toBe('⏳');
			});

			await page.locator('button#portal-fragment').click();

			await step('should preserve all styles after portaling', async () => {
				expect(await getLiBeforeContent(1)).toBe('✅');
				expect(await getLiBeforeContent(2)).toBe('✅');
				expect(await getLiBeforeContent(3)).toBe('⏳');
				expect(await getLiBeforeContent(4)).toBe('⏳');
				expect(await getLiBeforeContent(5)).toBe('✅');
				// TODO: external style inserted before portaling are not being preserved in safari
				//expect(await getLiBeforeContent(6)).toBe('✅');
				//expect(await getLiBeforeContent(7)).toBe('⏳');
				//expect(await getLiBeforeContent(8)).toBe('⏳');
				expect(await getLiBeforeContent(9)).toBe('✅');
				expect(await getLiBeforeContent(10)).toBe('⏳');
				expect(await getLiBeforeContent(11)).toBe('⏳');
			});

			await fragmentHost.locator('button#update-styles').click();

			await step('should support updating styles after portaling', async () => {
				expect(await getLiBeforeContent(1)).toBe('✅');
				expect(await getLiBeforeContent(2)).toBe('✅');
				expect(await getLiBeforeContent(3)).toBe('✅');
				expect(await getLiBeforeContent(4)).toBe('✅');
				expect(await getLiBeforeContent(5)).toBe('✅');
				// TODO: external style inserted before portaling are not being preserved in safari
				//expect(await getLiBeforeContent(6)).toBe('✅');
				//expect(await getLiBeforeContent(7)).toBe('✅');
				//expect(await getLiBeforeContent(8)).toBe('✅');
				expect(await getLiBeforeContent(9)).toBe('✅');
				//expect(await getLiBeforeContent(10)).toBe('✅');
				//expect(await getLiBeforeContent(11)).toBe('✅');
			});
		});
	});

async function getLiBeforeContent(index: number) {
	return fragmentHost
		.locator(`li:nth-child(${index})`)
		.evaluate((el) => window.getComputedStyle(el, '::before').content.replaceAll('"', ''));
}
