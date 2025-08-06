import { test, expect, Locator, Frame } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors, getFragmentContext } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

let fragment: Locator;
let fragmentContext: Frame;

beforeEach(async ({ page }) => {
	await page.goto('/reframing/');
	// wait for the fragment to load
	await page.waitForSelector('web-fragment h2');

	fragment = page.locator('web-fragment');
	fragmentContext = await getFragmentContext(fragment);
});

test('window sizing in fragment should delegate to the main context', async ({ page }) => {
	const sizeProperties = ['innerWidth', 'innerHeight', 'outerWidth', 'outerHeight', 'visualViewport'];
	for (const property of sizeProperties) {
		await step(`should delegate ${property} to the main context`, async () => {
			expect(await page.evaluate(`window.${property} === fragmentContext().${property}`)).toBe(true);
		});
	}
});

test('documentElement, head, and body sizing in fragment should delegate to the main context', async ({ page }) => {
	for (const element of ['documentElement', 'head', 'body']) {
		for (const property of ['clientHeight', 'clientWidth']) {
			await step(`should delegate ${element}.${property} to the main context`, async () => {
				expect(
					await page.evaluate(`document.${element}.${property} === fragmentContext().document.${element}.${property}`),
				).toBe(true);
			});
		}
	}
});

test('DOM related observers should be delegate to the main context', async ({ page }) => {
	const observers = ['IntersectionObserver', 'MutationObserver', 'ResizeObserver'];
	for (const property of observers) {
		await step(`should delegate ${property} to the main context`, async () => {
			expect(await page.evaluate(`window.${property} === fragmentContext().${property}`)).toBe(true);
		});
	}
});

test('Node, Document, Element be from the to the main context', async ({ page }) => {
	expect(await fragmentContext.evaluate(`document.querySelector('h2') instanceof Node`)).toBe(true);
	expect(await fragmentContext.evaluate(`document.querySelector('h2') instanceof Element`)).toBe(true);
	expect(await fragmentContext.evaluate(`document.querySelector('h2').firstChild instanceof Text`)).toBe(true);
});

test('matchMedia should delegate to the main context', async ({ page }) => {
	// the iframe window/document have 0px width so '(max-width: 755px)' returns false unless patched
	expect(await fragmentContext.evaluate(`window.matchMedia('(max-width: 755px)').matches`)).toBe(false);
});

test('document.title should read the value from <title> element, and write to it as well', async ({ page }) => {
	expect(await fragmentContext.evaluate(`document.title`)).toBe('hello fragment');
	// TODO: should we update the parent title when a bound fragment is initialized?
	//expect(await page.evaluate(`document.title`)).toBe('hello fragment');
	expect(await fragmentContext.evaluate(`document.title = 'hello fragment 2'`)).toBe('hello fragment 2');
	expect(await fragmentContext.evaluate(`document.title`)).toBe('hello fragment 2');
	// and we should also update the parent title
	expect(await page.evaluate(`document.title`)).toBe('hello fragment 2');
});
