import { test, expect, Locator, Frame } from '@playwright/test';
const { beforeEach, step, describe } = test;
import { failOnBrowserErrors, getFragmentContext } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

let fragment: Locator;
let fragmentContext: Frame;

declare global {
	interface Window {
		eventLog: string[][];
	}
}

beforeEach(async ({ page }) => {
	await page.goto('/reframed-event-registration/');

	fragment = page.locator('web-fragment');
	fragmentContext = await getFragmentContext(fragment);

	// wait for the fragment to load
	await expect(fragment.locator('h2')).toHaveText('reframed-event-registration fragment');

	// reset the log as some browsers fire focus event on page load, but this is not consistent across browsers
	await page.evaluate(() => (window.eventLog.length = 0));
});

describe('reframed: event registration', () => {
	test('harness init', async ({ page }) => {
		await step('ensure the test harness app loaded', async () => {
			await expect(page).toHaveTitle('WF Playground: reframed-event-registration');
			await expect(page.locator('h1')).toHaveText('WF Playground: reframed-event-registration');
		});

		const eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);
	});

	test('main click handling (<h1>)', async ({ page }) => {
		let eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		// clicking on h1 in the main document should not trigger any events in the fragment
		await page.locator('h1').click();

		eventLog = await page.evaluate(() => window.eventLog);
		// prettier-ignore
		expect(eventLog).toEqual([
		// type, phase, source, 				currentTarget, target, activeElement, isTrusted, composedPath
			['click', 1, 	'main window', 		'main window', 	'h1', 'main body',	true, 			'h1 > main body > main html > main document > main window'],
			['click', 1, 	'main document', 	'main document','h1', 'main body',	true, 			'h1 > main body > main html > main document > main window'],
			['click', 1, 	'main html', 			'main html', 		'h1', 'main body',	true, 			'h1 > main body > main html > main document > main window'],
			['click', 1, 	'main body', 			'main body', 		'h1', 'main body',	true, 			'h1 > main body > main html > main document > main window'],
			['click', 3, 	'main body', 			'main body', 		'h1', 'main body',	true, 			'h1 > main body > main html > main document > main window'],
			['click', 3, 	'main html', 			'main html', 		'h1', 'main body',	true, 			'h1 > main body > main html > main document > main window'],
			['click', 3, 	'main document', 	'main document','h1', 'main body',	true, 			'h1 > main body > main html > main document > main window'],
			['click', 3, 	'main window', 		'main window', 	'h1', 'main body',	true, 			'h1 > main body > main html > main document > main window'],
		]);
	});

	test('fragment click handling (<h2>)', async ({ page }) => {
		let eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		// clicking on h1 in the main document should not trigger any events in the fragment
		await fragment.locator('h2').click();

		eventLog = await page.evaluate(() => window.eventLog);
		// prettier-ignore
		expect(eventLog).toEqual([
		// type, phase, source, 				currentTarget, target, activeElement, isTrusted, composedPath
			['click',	1,	'main window',		'main window',	'web-fragment',	'main body',		true,			'h2 > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	1,	'main document',	'main document','web-fragment',	'main body',		true,			'h2 > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	1,	'main html',			'main html',		'web-fragment',	'main body',		true,			'h2 > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	1,	'main body',			'main body',		'web-fragment',	'main body',		true,			'h2 > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	1,	'wf window',			'wf window',		'h2',						'wf body',			true,			'h2 > wf body > wf html > wf document > wf window'],
			['click',	1,	'wf document',		'wf document',	'h2',						'wf body',			true,			'h2 > wf body > wf html > wf document > wf window'],
			['click',	1,	'wf html',				'wf html',			'h2',						'wf body',			true,			'h2 > wf body > wf html > wf document > wf window'],
			['click',	1,	'wf body',				'wf body',			'h2',						'wf body',			true,			'h2 > wf body > wf html > wf document > wf window'],
			['click',	3,	'wf body',				'wf body',			'h2',						'wf body',			true,			'h2 > wf body > wf html > wf document > wf window'],
			['click',	3,	'wf html',				'wf html',			'h2',						'wf body',			true,			'h2 > wf body > wf html > wf document > wf window'],
			['click',	3,	'wf document',		'wf document',	'h2',						'wf body',			true,			'h2 > wf body > wf html > wf document > wf window'],
			['click',	3,	'wf window',			'wf window',		'h2',						'wf body',			true,			'h2 > wf body > wf html > wf document > wf window'],
			['click',	3,	'main body',			'main body',		'web-fragment',	'main body',		true,			'h2 > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	3,	'main html',			'main html',		'web-fragment',	'main body',		true,			'h2 > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	3,	'main document',	'main document','web-fragment',	'main body',		true,			'h2 > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	3,	'main window',		'main window',	'web-fragment',	'main body',		true,			'h2 > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window']
		]);
	});

	test('main click handling (<html>)', async ({ page }) => {
		let eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		// clicking on the body element of the main document should!
		await page.click('html', { position: { x: 0, y: 0 } });

		eventLog = await page.evaluate(() => window.eventLog);

		// prettier-ignore
		expect(eventLog).toEqual([
		// type, phase, source, 				currentTarget, 	target, 		activeElement, isTrusted, composedPath
			['click', 1,	'main window',	'main window',	'main html','main body',		true,			'main html > main document > main window'],
			['click', 1,	'wf window',		'wf window',		'wf html',	'wf body',			true,			'wf html > wf document > wf window'],
			['click', 1,	'main document','main document','main html','main body',		true,			'main html > main document > main window'],
			['click', 1,	'wf document',	'wf document',	'wf html',	'wf body',			true,			'wf html > wf document > wf window'],
			['click', 2,	'main html',		'main html',		'main html','main body',		true,			'main html > main document > main window'],
			['click', 2,	'wf html',			'wf html',			'wf html',	'wf body',			true,			'wf html > wf document > wf window'],
			['click', 2,	'main html',		'main html',		'main html','main body',		true,			'main html > main document > main window'],
			['click', 2,	'wf html',			'wf html',			'wf html',	'wf body',			true,			'wf html > wf document > wf window'],
			['click', 3,	'main document','main document','main html','main body',		true,			'main html > main document > main window'],
			['click', 3,	'wf document',	'wf document',	'wf html',	'wf body',			true,			'wf html > wf document > wf window'],
			['click', 3,	'main window',	'main window',	'main html','main body',		true,			'main html > main document > main window'],
			['click', 3,	'wf window',		'wf window',		'wf html',	'wf body',			true,			'wf html > wf document > wf window'],
		]);
	});

	test('fragment click handling (<html>)', async ({ page }) => {
		let eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		// clicking on the body element of the main document should!
		await fragment.locator('wf-html').click();

		eventLog = await page.evaluate(() => window.eventLog);

		// prettier-ignore
		expect(eventLog).toEqual([
		// type, 		phase, source, 				currentTarget, 		target, 			activeElement, 	isTrusted, composedPath
			['click',	1,	'main window',		'main window',		'web-fragment',	'main body',		true,			'body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	1,	'main document',	'main document',	'web-fragment',	'main body',		true,			'body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	1,	'main html',			'main html',			'web-fragment',	'main body',		true,			'body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	1,	'main body',			'main body',			'web-fragment',	'main body',		true,			'body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	1,	'wf window',			'wf window',			'wf body',			'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['click',	1,	'wf document',		'wf document',		'wf body',			'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['click',	1,	'wf html',				'wf html',				'wf body',			'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['click',	2,	'wf body',				'wf body',				'wf body',			'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['click',	2,	'wf body',				'wf body',				'wf body',			'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['click',	3,	'wf html',				'wf html',				'wf body',			'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['click',	3,	'wf document',		'wf document',		'wf body',			'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['click',	3,	'wf window',			'wf window',			'wf body',			'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['click',	3,	'main body',			'main body',			'web-fragment',	'main body',		true,			'body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	3,	'main html',			'main html',			'web-fragment',	'main body',		true,			'body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	3,	'main document',	'main document',	'web-fragment',	'main body',		true,			'body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',	3,	'main window',		'main window',		'web-fragment',	'main body',		true,			'body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window']
		]);
	});

	test('main click handling ("click me" button)', async ({ page, browserName }) => {
		let eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		// clicking on the body element of the main document should!
		await page.click('#clickButton');

		eventLog = await page.evaluate(() => window.eventLog);

		// for some weird reason *local* webkit running under playwright doesn't fire focus events
		// eslint-disable-next-line playwright/no-conditional-in-test
		if (!process.env.CI && browserName === 'webkit') {
			// prettier-ignore
			// eslint-disable-next-line playwright/no-conditional-expect
			expect(eventLog).toEqual([
				// type, phase, source, 				currentTarget, 		target, 	activeElement, isTrusted, composedPath
				['click', 1,	'main window',		'main window',	'button',	'main body',	true,	'button > section > main body > main html > main document > main window'],
				['click', 1,	'main document',	'main document','button',	'main body',	true,	'button > section > main body > main html > main document > main window'],
				['click', 1,	'main html',			'main html',		'button',	'main body',	true,	'button > section > main body > main html > main document > main window'],
				['click', 1,	'main body',			'main body',		'button',	'main body',	true,	'button > section > main body > main html > main document > main window'],
				['click', 2,	'button',					'button',				'button',	'main body',	true,	'button > section > main body > main html > main document > main window'],
				['click', 2,	'button',					'button',				'button',	'main body',	true,	'button > section > main body > main html > main document > main window'],
				['click', 3,	'main body',			'main body',		'button',	'main body',	true,	'button > section > main body > main html > main document > main window'],
				['click', 3,	'main html',			'main html',		'button',	'main body',	true,	'button > section > main body > main html > main document > main window'],
				['click', 3,	'main document',	'main document','button',	'main body',	true,	'button > section > main body > main html > main document > main window'],
				['click', 3,	'main window',		'main window',	'button',	'main body',	true,	'button > section > main body > main html > main document > main window'],
			]);
		} else {
			// prettier-ignore
			// eslint-disable-next-line playwright/no-conditional-expect
			expect(eventLog).toEqual([
				// type, phase, source, 				currentTarget, 		target, 	activeElement, isTrusted, composedPath
				['focus',		1,	'main window',		'main window',	'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focus',		1,	'main document',	'main document','button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focus',		1,	'main html',			'main html',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focus',		1,	'main body',			'main body',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',	1,	'main window',		'main window',	'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',	1,	'main document',	'main document','button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',	1,	'main html',			'main html',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',	1,	'main body',			'main body',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',	3,	'main body',			'main body',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',	3,	'main html',			'main html',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',	3,	'main document',	'main document','button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',	3,	'main window',		'main window',	'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',		1,	'main window',		'main window',	'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',		1,	'main document',	'main document','button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',		1,	'main html',			'main html',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',		1,	'main body',			'main body',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',		2,	'button',					'button',				'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',		2,	'button',					'button',				'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',		3,	'main body',			'main body',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',		3,	'main html',			'main html',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',		3,	'main document',	'main document','button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',		3,	'main window',		'main window',	'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
			]);
		}
	});

	test('fragment click handling ("click me" button)', async ({ page, browserName }) => {
		let eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		// clicking on the body element of the main document should!
		await fragment.locator('#wfClickButton').click();

		eventLog = await page.evaluate(() => window.eventLog);

		// for some weird reason local webkit running under playwright doesn't fire focus events
		// eslint-disable-next-line playwright/no-conditional-in-test
		if (!process.env.CI && browserName === 'webkit') {
			// prettier-ignore
			// eslint-disable-next-line playwright/no-conditional-expect
			expect(eventLog).toEqual([
			// type, 		phase, source, 				currentTarget, 		target, 			activeElement, 	isTrusted, composedPath
				['click',	1,	'main window',		'main window',		'web-fragment',	'main body',		true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',	1,	'main document',	'main document',	'web-fragment',	'main body',		true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',	1,	'main html',			'main html',			'web-fragment',	'main body',		true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',	1,	'main body',			'main body',			'web-fragment',	'main body',		true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',	1,	'wf window',			'wf window',			'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',	1,	'wf document',		'wf document',		'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',	1,	'wf html',				'wf html',				'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',	1,	'wf body',				'wf body',				'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',	2,	'button',					'button',					'button',				'wf body',			true,			'button > section > wf body > wf html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > body > html > [object HTMLDocument] > [object Window]'],
				['click',	2,	'button',					'button',					'button',				'wf body',			true,			'button > section > wf body > wf html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > body > html > [object HTMLDocument] > [object Window]'],
				['click',	3,	'wf body',				'wf body',				'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',	3,	'wf html',				'wf html',				'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',	3,	'wf document',		'wf document',		'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',	3,	'wf window',			'wf window',			'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',	3,	'main body',			'main body',			'web-fragment',	'main body',		true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',	3,	'main html',			'main html',			'web-fragment',	'main body',		true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',	3,	'main document',	'main document',	'web-fragment',	'main body',		true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',	3,	'main window',		'main window',		'web-fragment',	'main body',		true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			]);
		} else {
			// prettier-ignore
			// eslint-disable-next-line playwright/no-conditional-expect
			expect(eventLog).toEqual([
			// type, 	phase, 	source, 				currentTarget, 			target, 				activeElement, 		isTrusted, composedPath
				['focus',		1,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focus',		1,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focus',		1,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focus',		1,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focus',		1,	'wf window',			'wf window',			'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focus',		1,	'wf document',		'wf document',		'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focus',		1,	'wf html',				'wf html',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focus',		1,	'wf body',				'wf body',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',	1,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	1,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	1,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	1,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	1,	'wf window',			'wf window',			'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',	1,	'wf document',		'wf document',		'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',	1,	'wf html',				'wf html',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',	1,	'wf body',				'wf body',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',	3,	'wf body',				'wf body',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',	3,	'wf html',				'wf html',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',	3,	'wf document',		'wf document',		'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',	3,	'wf window',			'wf window',			'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',	3,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	3,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	3,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	3,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		1,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		1,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		1,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		1,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		1,	'wf window',			'wf window',			'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		1,	'wf document',		'wf document',		'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		1,	'wf html',				'wf html',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		1,	'wf body',				'wf body',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		2,	'button',					'button',					'button',				'button',				true,			'button > section > wf body > wf html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > body > html > [object HTMLDocument] > [object Window]'],
				['click',		2,	'button',					'button',					'button',				'button',				true,			'button > section > wf body > wf html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > body > html > [object HTMLDocument] > [object Window]'],
				['click',		3,	'wf body',				'wf body',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		3,	'wf html',				'wf html',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		3,	'wf document',		'wf document',		'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		3,	'wf window',			'wf window',			'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		3,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		3,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		3,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		3,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window']
			]);
		}
	});

	test('main click handling ("focus input" button)', async ({ page, browserName }) => {
		let eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		// clicking on the body element of the main document should!
		await page.click('#focusButton');

		eventLog = await page.evaluate(() => window.eventLog);

		// for some weird reason local webkit running under playwright doesn't fire focus events
		// eslint-disable-next-line playwright/no-conditional-in-test
		if (!process.env.CI && browserName === 'webkit') {
			// prettier-ignore
			// eslint-disable-next-line playwright/no-conditional-expect
			expect(eventLog).toEqual([
				// type, phase, source, 				currentTarget, 		target, 	activeElement, isTrusted, composedPath
				['click',		1,	'main window',		'main window',	'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['click',		1,	'main document',	'main document','button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['click',		1,	'main html',			'main html',		'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['click',		1,	'main body',			'main body',		'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['click',		2,	'#focusButton',		'button',				'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['focus',		1,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focus',		1,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focus',		1,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focus',		1,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',	1,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',	1,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',	1,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',	1,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',	3,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',	3,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',	3,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',	3,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['click',		3,	'main body',			'main body',		'button',	'input',				true,			'button > section > main body > main html > main document > main window'],
				['click',		3,	'main html',			'main html',		'button',	'input',				true,			'button > section > main body > main html > main document > main window'],
				['click',		3,	'main document',	'main document','button',	'input',				true,			'button > section > main body > main html > main document > main window'],
				['click',		3,	'main window',		'main window',	'button',	'input',				true,			'button > section > main body > main html > main document > main window'],
			]);
		} else {
			// prettier-ignore
			// eslint-disable-next-line playwright/no-conditional-expect
			expect(eventLog).toEqual([
				// type, 	phase, 	source, 					currentTarget, 	target, 	activeElement, isTrusted, composedPath
				['focus',			1,	'main window',		'main window',	'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focus',			1,	'main document',	'main document','button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focus',			1,	'main html',			'main html',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focus',			1,	'main body',			'main body',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',		1,	'main window',		'main window',	'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',		1,	'main document',	'main document','button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',		1,	'main html',			'main html',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',		1,	'main body',			'main body',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',		3,	'main body',			'main body',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',		3,	'main html',			'main html',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',		3,	'main document',	'main document','button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['focusin',		3,	'main window',		'main window',	'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',			1,	'main window',		'main window',	'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',			1,	'main document',	'main document','button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',			1,	'main html',			'main html',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',			1,	'main body',			'main body',		'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['click',			2,	'#focusButton',		'button',				'button',	'button',				true,			'button > section > main body > main html > main document > main window'],
				['blur',			1,	'main window',		'main window',	'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['blur',			1,	'main document',	'main document','button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['blur',			1,	'main html',			'main html',		'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['blur',			1,	'main body',			'main body',		'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['focusout',	1,	'main window',		'main window',	'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['focusout',	1,	'main document',	'main document','button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['focusout',	1,	'main html',			'main html',		'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['focusout',	1,	'main body',			'main body',		'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['focusout',	3,	'main body',			'main body',		'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['focusout',	3,	'main html',			'main html',		'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['focusout',	3,	'main document',	'main document','button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['focusout',	3,	'main window',		'main window',	'button',	'main body',		true,			'button > section > main body > main html > main document > main window'],
				['focus',			1,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focus',			1,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focus',			1,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focus',			1,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',		1,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',		1,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',		1,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',		1,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',		3,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',		3,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',		3,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['focusin',		3,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
				['click',			3,	'main body',			'main body',		'button',	'input',				true,			'button > section > main body > main html > main document > main window'],
				['click',			3,	'main html',			'main html',		'button',	'input',				true,			'button > section > main body > main html > main document > main window'],
				['click',			3,	'main document',	'main document','button',	'input',				true,			'button > section > main body > main html > main document > main window'],
				['click',			3,	'main window',		'main window',	'button',	'input',				true,			'button > section > main body > main html > main document > main window'],
		]);
		}
	});

	test('fragment click handling ("focus input" button)', async ({ page, browserName }) => {
		let eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		// clicking on the body element of the main document should!
		await fragment.locator('#wfFocusButton').click();

		eventLog = await page.evaluate(() => window.eventLog);

		// for some weird reason local webkit running under playwright doesn't fire focus events
		// eslint-disable-next-line playwright/no-conditional-in-test
		if (!process.env.CI && browserName === 'webkit') {
			// prettier-ignore
			// eslint-disable-next-line playwright/no-conditional-expect
			expect(eventLog).toEqual([
				// type, 		phase, source, 				currentTarget, 		target, 				activeElement, 	isTrusted, composedPath
				['click',		1,	'main window',		'main window',		'web-fragment',	'main body',		true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		1,	'main document',	'main document',	'web-fragment',	'main body',		true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		1,	'main html',			'main html',			'web-fragment',	'main body',		true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		1,	'main body',			'main body',			'web-fragment',	'main body',		true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		1,	'wf window',			'wf window',			'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		1,	'wf document',		'wf document',		'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		1,	'wf html',				'wf html',				'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		1,	'wf body',				'wf body',				'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		2,	'#wfFocusButton',	'button',					'button',				'wf body',			true,			'button > section > wf body > wf html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > body > html > [object HTMLDocument] > [object Window]'],
				['focus',		1,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focus',		1,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focus',		1,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focus',		1,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focus',		1,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focus',		1,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focus',		1,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focus',		1,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',	1,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	1,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	1,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	1,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	1,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',	1,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',	1,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',	1,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',	3,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',	3,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',	3,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',	3,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',	3,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	3,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	3,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',	3,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		3,	'wf body',				'wf body',				'button',				'input',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		3,	'wf html',				'wf html',				'button',				'input',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		3,	'wf document',		'wf document',		'button',				'input',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		3,	'wf window',			'wf window',			'button',				'input',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',		3,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		3,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		3,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',		3,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			]);
		} else {
			// prettier-ignore
			// eslint-disable-next-line playwright/no-conditional-expect
			expect(eventLog).toEqual([
				// type, 		phase, 	source, 				currentTarget, 		target, 				activeElement, 	isTrusted, composedPath
				['focus',			1,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focus',			1,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focus',			1,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focus',			1,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focus',			1,	'wf window',			'wf window',			'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focus',			1,	'wf document',		'wf document',		'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focus',			1,	'wf html',				'wf html',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focus',			1,	'wf body',				'wf body',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',		1,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',		1,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',		1,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',		1,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',		1,	'wf window',			'wf window',			'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',		1,	'wf document',		'wf document',		'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',		1,	'wf html',				'wf html',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',		1,	'wf body',				'wf body',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',		3,	'wf body',				'wf body',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',		3,	'wf html',				'wf html',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',		3,	'wf document',		'wf document',		'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',		3,	'wf window',			'wf window',			'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusin',		3,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',		3,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',		3,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['focusin',		3,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',			1,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',			1,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',			1,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',			1,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',			1,	'wf window',			'wf window',			'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',			1,	'wf document',		'wf document',		'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',			1,	'wf html',				'wf html',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',			1,	'wf body',				'wf body',				'button',				'button',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',			2,	'#wfFocusButton',	'button',					'button',				'button',				true,			'button > section > wf body > wf html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > body > html > [object HTMLDocument] > [object Window]'],
				['blur',			1,	'wf window',			'wf window',			'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['blur',			1,	'wf document',		'wf document',		'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['blur',			1,	'wf html',				'wf html',				'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['blur',			1,	'wf body',				'wf body',				'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusout',	1,	'wf window',			'wf window',			'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusout',	1,	'wf document',		'wf document',		'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusout',	1,	'wf html',				'wf html',				'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusout',	1,	'wf body',				'wf body',				'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusout',	3,	'wf body',				'wf body',				'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusout',	3,	'wf html',				'wf html',				'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusout',	3,	'wf document',		'wf document',		'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['focusout',	3,	'wf window',			'wf window',			'button',				'wf body',			true,			'button > section > wf body > wf html > wf document > wf window'],
				['focus',			1,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focus',			1,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focus',			1,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focus',			1,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',		1,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',		1,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',		1,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',		1,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',		3,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',		3,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',		3,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['focusin',		3,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
				['click',			3,	'wf body',				'wf body',				'button',				'input',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',			3,	'wf html',				'wf html',				'button',				'input',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',			3,	'wf document',		'wf document',		'button',				'input',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',			3,	'wf window',			'wf window',			'button',				'input',				true,			'button > section > wf body > wf html > wf document > wf window'],
				['click',			3,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',			3,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',			3,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
				['click',			3,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'button > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window']
		]);
		}
	});

	test('main keydown handling (<body>)', async ({ page }) => {
		let eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		await page.keyboard.press('x');

		eventLog = await page.evaluate(() => window.eventLog);
		// prettier-ignore
		expect(eventLog).toEqual([
		// type, 		phase, source, 				currentTarget, 	target, 		activeElement, isTrusted, composedPath
			['keydown', 1,	'main window',	'main window',	'main body','main body',		true,			'main body > main html > main document > main window'],
			['keydown', 1,	'wf window',		'wf window',		'wf body',	'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['keydown', 1,	'main document','main document','main body','main body',		true,			'main body > main html > main document > main window'],
			['keydown', 1,	'wf document',	'wf document',	'wf body',	'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['keydown', 1,	'main html',		'main html',		'main body','main body',		true,			'main body > main html > main document > main window'],
			['keydown', 1,	'wf html',			'wf html',			'wf body',	'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['keydown', 2,	'main body',		'main body',		'main body','main body',		true,			'main body > main html > main document > main window'],
			['keydown', 2,	'wf body',			'wf body',			'wf body',	'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['keydown', 2,	'main body',		'main body',		'main body','main body',		true,			'main body > main html > main document > main window'],
			['keydown', 2,	'wf body',			'wf body',			'wf body',	'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['keydown', 3,	'main html',		'main html',		'main body','main body',		true,			'main body > main html > main document > main window'],
			['keydown', 3,	'wf html',			'wf html',			'wf body',	'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['keydown', 3,	'main document','main document','main body','main body',		true,			'main body > main html > main document > main window'],
			['keydown', 3,	'wf document',	'wf document',	'wf body',	'wf body',			true,			'wf body > wf html > wf document > wf window'],
			['keydown', 3,	'main window',	'main window',	'main body','main body',		true,			'main body > main html > main document > main window'],
			['keydown', 3,	'wf window',		'wf window',		'wf body',	'wf body',			true,			'wf body > wf html > wf document > wf window'],
		]);
	});

	// this scenario is the same as the main scenario above — fragment's body can't be implicitly focused in a new way other than by focusing the main body
	// test.skip('fragment keydown handling (<body>)', () => {});

	test('main keydown handling (<input>)', async ({ page }) => {
		let eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		await page.click('#focusableInput');

		eventLog = await page.evaluate(() => window.eventLog);
		// prettier-ignore
		expect(eventLog).toEqual([
			// type, 		phase, source, 				currentTarget, 	target, 		activeElement, isTrusted, composedPath
			['focus',		1,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['focus',		1,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['focus',		1,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['focus',		1,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['focusin',	1,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['focusin',	1,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['focusin',	1,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['focusin',	1,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['focusin',	3,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['focusin',	3,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['focusin',	3,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['focusin',	3,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['click',		1,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['click',		1,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['click',		1,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['click',		1,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['click',		3,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['click',		3,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['click',		3,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['click',		3,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window']
		]);

		await page.evaluate(() => (window.eventLog.length = 0));
		eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		await page.keyboard.press('x');

		eventLog = await page.evaluate(() => window.eventLog);
		// prettier-ignore
		expect(eventLog).toEqual([
			// type, 		phase, source, 				currentTarget, 	target, 		activeElement, isTrusted, composedPath
			['keydown',	1,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['keydown',	1,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['keydown',	1,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['keydown',	1,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['keydown',	2,	'input',					'input',				'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['keydown',	2,	'input',					'input',				'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['keydown',	3,	'main body',			'main body',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['keydown',	3,	'main html',			'main html',		'input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['keydown',	3,	'main document',	'main document','input',	'input',				true,			'input > section > main body > main html > main document > main window'],
			['keydown',	3,	'main window',		'main window',	'input',	'input',				true,			'input > section > main body > main html > main document > main window']
		]);
	});

	test('fragment keydown handling (<input>)', async ({ page }) => {
		let eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		// oddly webkit refuses to click on the input and claims that the following:
		//   <web-fragment fragment-id="reframed-event-registration"></web-fragment> intercepts pointer events
		// which doesn't make sense — `{force :true}` helps to overcome this issue
		// eslint-disable-next-line playwright/no-force-option
		await fragment.locator('#wfFocusableInput').click({ force: true });

		eventLog = await page.evaluate(() => window.eventLog);
		// prettier-ignore
		expect(eventLog).toEqual([
			// type, 	phase, source, 					currentTarget, 		target, 				activeElement, 	isTrusted, composedPath
			['focus',		1,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['focus',		1,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['focus',		1,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['focus',		1,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['focus',		1,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['focus',		1,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['focus',		1,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['focus',		1,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['focusin',	1,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['focusin',	1,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['focusin',	1,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['focusin',	1,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['focusin',	1,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['focusin',	1,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['focusin',	1,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['focusin',	1,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['focusin',	3,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['focusin',	3,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['focusin',	3,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['focusin',	3,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['focusin',	3,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['focusin',	3,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['focusin',	3,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['focusin',	3,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',		1,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',		1,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',		1,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',		1,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',		1,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['click',		1,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['click',		1,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['click',		1,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['click',		3,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['click',		3,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['click',		3,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['click',		3,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['click',		3,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',		3,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',		3,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['click',		3,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window']
		]);

		await page.evaluate(() => (window.eventLog.length = 0));
		eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		await page.keyboard.press('x');

		eventLog = await page.evaluate(() => window.eventLog);
		// prettier-ignore
		expect(eventLog).toEqual([
			// type, 	phase, source, 				currentTarget, 			target, 				activeElement, 	isTrusted, composedPath
			['keydown',	1,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['keydown',	1,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['keydown',	1,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['keydown',	1,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['keydown',	1,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['keydown',	1,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['keydown',	1,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['keydown',	1,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['keydown',	2,	'input',					'input',					'input',				'input',				true,			'input > section > wf body > wf html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > body > html > [object HTMLDocument] > [object Window]'],
			['keydown',	2,	'input',					'input',					'input',				'input',				true,			'input > section > wf body > wf html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > body > html > [object HTMLDocument] > [object Window]'],
			['keydown',	3,	'wf body',				'wf body',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['keydown',	3,	'wf html',				'wf html',				'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['keydown',	3,	'wf document',		'wf document',		'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['keydown',	3,	'wf window',			'wf window',			'input',				'input',				true,			'input > section > wf body > wf html > wf document > wf window'],
			['keydown',	3,	'main body',			'main body',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['keydown',	3,	'main html',			'main html',			'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['keydown',	3,	'main document',	'main document',	'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window'],
			['keydown',	3,	'main window',		'main window',		'web-fragment',	'web-fragment',	true,			'input > section > body > html > wf-document > [object ShadowRoot] > web-fragment-host > [object ShadowRoot] > web-fragment > main body > main html > main document > main window']
		]);
	});

	test('custom event window dispatch', async ({ page }) => {
		let eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(0);

		await fragmentContext.evaluate(() => window.dispatchEvent(new CustomEvent('myCustomEvent')));

		eventLog = await page.evaluate(() => window.eventLog);
		expect(eventLog.length).toBe(2);
		expect(eventLog).toEqual([
			['myCustomEvent', 2, 'wf window', 'wf window', 'wf window', 'wf body', false, 'wf window'],
			['myCustomEvent', 2, 'wf window', 'wf window', 'wf window', 'wf body', false, 'wf window'],
		]);
	});
});
