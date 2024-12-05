import { test, expect, Locator, Frame } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors, getFragmentContext } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

let mainSection: Locator;
let boundFragment: Locator;
let standaloneFragment: Locator;
let boundContext: Frame;
let standaloneContext: Frame;
let main: {
	locationHref: Function;
	historyLength: Function;
	back: Function;
	forward: Function;
	goToFooButton: Locator;
	goToBarButton: Locator;
};
let bound: {
	locationHref: Function;
	historyLength: Function;
	back: Function;
	forward: Function;
	goToFooButton: Locator;
	goToBarButton: Locator;
};

// TODO: all standalone code in this file is temporarily disabled since we don't yet support standalone fragments
// let standalone: {
// 	locationHref: Function;
// 	historyLength: Function;
// 	back: Function;
// 	forward: Function;
// 	goToFooButton: Locator;
// 	goToBarButton: Locator;
// };

beforeEach(async ({ page, browserName }) => {
	// Even though Firefox starts at about:blank, this initial navigation isn't recorded as a normal window.history record.
	// For this reason, we explicitly navigate to about:blank, which enable history.length and history.back() to work correctly.
	// Only Firefox behaves like this, chrome and webkit create a normal history record for the initial about:blank navigation.
	if (browserName === 'firefox') {
		await page.goto('about:blank');
	}

	await expect(page).toHaveURL('about:blank');
	await page.goto('/location-and-history/');

	mainSection = page.locator('body > section');
	main = {
		locationHref: () => page.evaluate(() => location.href),
		historyLength: () => page.evaluate(() => history.length),
		back: () => page.evaluate(() => history.back()),
		forward: () => page.evaluate(() => history.forward()),
		goToFooButton: mainSection.locator('button').getByText('go to /foo'),
		goToBarButton: mainSection.locator('button').getByText('go to /bar'),
	};

	boundFragment = page.locator('fragment-host');
	//standaloneFragment = page.locator('fragment-host[src="/location-and-history/standalone"]');

	boundContext = await getFragmentContext(boundFragment);
	//standaloneContext = await getFragmentContext(standaloneFragment);

	bound = {
		locationHref: async () => (await getFragmentContext(boundFragment)).evaluate(() => location.href),
		historyLength: async () => (await getFragmentContext(boundFragment)).evaluate(() => history.length),
		back: () => boundContext.evaluate(() => history.back()),
		forward: () => boundContext.evaluate(() => history.forward()),
		goToFooButton: boundFragment.locator('button').getByText('go to /foo'),
		goToBarButton: boundFragment.locator('button').getByText('go to /bar'),
	};

	// standalone = {
	// 	locationHref: async () => (await getFragmentContext(standaloneFragment)).evaluate(() => location.href),
	// 	historyLength: async () => (await getFragmentContext(standaloneFragment)).evaluate(() => history.length),
	// 	back: () => standaloneContext.evaluate(() => history.back()),
	// 	forward: () => standaloneContext.evaluate(() => history.forward()),
	// 	goToFooButton: standaloneFragment.locator('button').getByText('go to /foo'),
	// 	goToBarButton: standaloneFragment.locator('button').getByText('go to /bar'),
	// };
});

test('location.href initialization', async ({ page }) => {
	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF TestBed: location-and-history');
		await expect(page.locator('h1')).toHaveText('WF TestBed: location-and-history');
	});
	await step('ensure that initial location.href of the main frame is correct', async () => {
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	});
	// await step('ensure that initial location.href of the standalone fragment is its src', async () => {
	// 	expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);
	// });
	await step('ensure that initial location.href of the bound fragment is the main location.href', async () => {
		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	});
});

test('changing main location.href should only impact the main frame and bound fragment', async () => {
	// go to /foo
	await main.goToFooButton.click();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);

	// go to /bar
	await main.goToBarButton.click();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
});

test('changing location.href should only impact the main frame and bound fragment', async () => {
	// go to /foo
	await bound.goToFooButton.click();
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);

	// go to /bar
	await bound.goToBarButton.click();
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
});

// test('changing standalone location.href should only impact itself and not other fragments or main', async () => {
// 	// go to /foo
// 	await standalone.goToFooButton.click();
// 	expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
// 	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);

// 	// go to /bar
// 	await standalone.goToBarButton.click();
// 	expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
// 	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// });

test('back and forward via browser buttons or history.forward()/.back() should work correctly after navigation in the main context', async ({
	page,
}) => {
	await main.goToFooButton.click();
	await main.goToBarButton.click();

	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);

	await main.back();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);

	await page.goBack();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);

	await main.forward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);

	await page.goForward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);
});

test('back and forward via browser buttons or history.forward()/.back() should work correctly after navigation in a bound fragment', async ({
	page,
}) => {
	await bound.goToFooButton.click();
	await bound.goToBarButton.click();

	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);

	await main.back();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);

	await page.goBack();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);

	await main.forward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);

	await page.goForward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);

	await bound.back();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);

	await bound.forward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);
});

// test('history.forward()/.back() in a standalone fragment should update location and history within the fragment only', async ({
// 	page,
// }) => {
// 	await standalone.goToFooButton.click();
// 	await standalone.goToBarButton.click();

// 	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 	expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);

// 	await standalone.back();
// 	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 	expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);

// 	await standalone.forward();
// 	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 	expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
// });

test('bfcache should not cause bound fragment to be mistaken for the shell app even though they share the same url', async ({
	page,
	browserName,
}) => {
	await expect(page).toHaveURL(/http:\/\/localhost:\d+\/location-and-history\//);
	await expect(page).toHaveTitle('WF TestBed: location-and-history');

	if (browserName === 'firefox') {
		// TODO: in FF we currently create an extra history record — this is a bug
		// Fix for this needs to be cherry-picked from:
		// https://github.com/web-fragments/web-fragments/pull/116/files#diff-5bd72dce661e784e4d04596ba00610b72b1cea81099c38f39b9d54bf1687a591R140-R202
		expect(await main.historyLength()).toBe(3);
		// This issue then triggers some odd playwright bugs that prevent it from going back to about:blank so we just bail
		return;
	}

	expect(await main.historyLength()).toBe(2);

	await page.goBack();

	await expect(page).toHaveURL('about:blank');
	await expect(page).toHaveTitle('');

	await page.goForward();

	await expect(page).toHaveTitle('WF TestBed: location-and-history');
	expect(await page.evaluate(() => document.title)).toBe('WF TestBed: location-and-history');

	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	// expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);
});

// test('standalone fragment should not participate in history management', async ({ page }) => {
// 	expect(await main.historyLength()).toBe(2);
// 	expect(await bound.historyLength()).toBe(2);
// 	expect(await standalone.historyLength()).toBe(1);

// 	await step('standalone fragment can still pushState and replaceState to enable internal routing', async () => {
// 		await standalone.goToFooButton.click();

// 		// should not add history records to the main history
// 		expect(await main.historyLength()).toBe(2);
// 		expect(await bound.historyLength()).toBe(2);
// 		expect(await standalone.historyLength()).toBe(2);
// 		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 		expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);

// 		await standalone.goToBarButton.click();
// 		expect(await main.historyLength()).toBe(2);
// 		expect(await standalone.historyLength()).toBe(3);
// 		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 		expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);

// 		await standalone.back();
// 		await standalone.back();
// 		expect(await main.historyLength()).toBe(2);
// 		expect(await standalone.historyLength()).toBe(3);
// 		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 		expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/standalone/);

// 		await standalone.goToBarButton.click();
// 		expect(await main.historyLength()).toBe(2);
// 		// we dropped one history record because the history has been forked and rewritten by the last navigation to /bar
// 		expect(await standalone.historyLength()).toBe(2);
// 		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 		expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
// 	});

// 	await step('browser back and forward buttons should not affect standalone fragments', async () => {
// 		await bound.goToFooButton.click();
// 		expect(await main.historyLength()).toBe(3);
// 		expect(await bound.historyLength()).toBe(3);
// 		expect(await standalone.historyLength()).toBe(2);
// 		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
// 		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
// 		expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
// 		await standalone.goToBarButton.click();
// 		expect(await main.historyLength()).toBe(3);
// 		expect(await bound.historyLength()).toBe(3);
// 		expect(await standalone.historyLength()).toBe(3);

// 		// history.forward() and history.back() in a standalone fragment should not affect main navigation
// 		await bound.back();
// 		expect(await main.historyLength()).toBe(3);
// 		expect(await bound.historyLength()).toBe(3);
// 		expect(await standalone.historyLength()).toBe(3);
// 		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
// 		expect(await standalone.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
// 	});
// });
