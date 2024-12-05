import { test, expect, Locator, Frame } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors, getFragmentContext } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

let mainSection: Locator;
let routableFragment: Locator;
let nonRoutableFragment: Locator;
let routableContext: Frame;
let nonRoutableContext: Frame;
let main: {
	locationHref: Function;
	historyLength: Function;
	back: Function;
	forward: Function;
	goToFooButton: Locator;
	goToBarButton: Locator;
};
let routable: {
	locationHref: Function;
	historyLength: Function;
	back: Function;
	forward: Function;
	goToFooButton: Locator;
	goToBarButton: Locator;
};
let nonRoutable: {
	locationHref: Function;
	historyLength: Function;
	back: Function;
	forward: Function;
	goToFooButton: Locator;
	goToBarButton: Locator;
};

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

	routableFragment = page.locator('fragment-host[src="*"]');
	nonRoutableFragment = page.locator('fragment-host[src="/location-and-history/non-routable"]');

	routableContext = await getFragmentContext(routableFragment);
	nonRoutableContext = await getFragmentContext(nonRoutableFragment);

	routable = {
		locationHref: async () => (await getFragmentContext(routableFragment)).evaluate(() => location.href),
		historyLength: async () => (await getFragmentContext(routableFragment)).evaluate(() => history.length),
		back: () => routableContext.evaluate(() => history.back()),
		forward: () => routableContext.evaluate(() => history.forward()),
		goToFooButton: routableFragment.locator('button').getByText('go to /foo'),
		goToBarButton: routableFragment.locator('button').getByText('go to /bar'),
	};

	nonRoutable = {
		locationHref: async () => (await getFragmentContext(nonRoutableFragment)).evaluate(() => location.href),
		historyLength: async () => (await getFragmentContext(nonRoutableFragment)).evaluate(() => history.length),
		back: () => nonRoutableContext.evaluate(() => history.back()),
		forward: () => nonRoutableContext.evaluate(() => history.forward()),
		goToFooButton: nonRoutableFragment.locator('button').getByText('go to /foo'),
		goToBarButton: nonRoutableFragment.locator('button').getByText('go to /bar'),
	};
});

test('location.href initialization', async ({ page }) => {
	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF TestBed: location-and-history');
		await expect(page.locator('h1')).toHaveText('WF TestBed: location-and-history');
	});
	await step('ensure that initial location.href of the main frame is correct', async () => {
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	});
	await step('ensure that initial location.href of the non-routable fragment is its src', async () => {
		expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);
	});
	await step('ensure that initial location.href of the routable fragment is the main location.href', async () => {
		expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	});
});

test('changing main location.href should only impact the main frame and routable fragment', async () => {
	// go to /foo
	await main.goToFooButton.click();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);

	// go to /bar
	await main.goToBarButton.click();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
});

test('changing routable location.href should only impact the main frame and routable fragment', async () => {
	// go to /foo
	await routable.goToFooButton.click();
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);

	// go to /bar
	await routable.goToBarButton.click();
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
});

test('changing non-routable location.href should only impact itself and not other fragments or main', async () => {
	// go to /foo
	await nonRoutable.goToFooButton.click();
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);

	// go to /bar
	await nonRoutable.goToBarButton.click();
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
});

test('back and forward via browser buttons or history.forward()/.back() should work correctly after navigation in the main context', async ({
	page,
}) => {
	await main.goToFooButton.click();
	await main.goToBarButton.click();

	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);

	await main.back();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);

	await page.goBack();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);

	await main.forward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);

	await page.goForward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);
});

test('back and forward via browser buttons or history.forward()/.back() should work correctly after navigation in a routable fragment', async ({
	page,
}) => {
	await routable.goToFooButton.click();
	await routable.goToBarButton.click();

	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);

	await main.back();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);

	await page.goBack();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);

	await main.forward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);

	await page.goForward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);

	await routable.back();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);

	await routable.forward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);
});

test('history.forward()/.back() in non-routable fragment should update location and history within the fragment only', async ({
	page,
}) => {
	await nonRoutable.goToFooButton.click();
	await nonRoutable.goToBarButton.click();

	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);

	await nonRoutable.back();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);

	await nonRoutable.forward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
});

test('bfcache should not cause routable fragment to be mistaken for the shell app even though they share the same url', async ({
	page,
}) => {
	await expect(page).toHaveURL(/http:\/\/localhost:\d+\/location-and-history\//);
	await expect(page).toHaveTitle('WF TestBed: location-and-history');
	expect(await main.historyLength()).toBe(2);

	await page.goBack();

	await expect(page).toHaveURL('about:blank');
	await expect(page).toHaveTitle('');

	await page.goForward();

	await expect(page).toHaveTitle('WF TestBed: location-and-history');
	expect(await page.evaluate(() => document.title)).toBe('WF TestBed: location-and-history');

	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);
});

test('non-routable fragment should not participate in history management', async ({ page }) => {
	expect(await main.historyLength()).toBe(2);
	expect(await routable.historyLength()).toBe(2);
	expect(await nonRoutable.historyLength()).toBe(1);

	await step('non-routable fragmenst can still pushState and replaceState to enable internal routing', async () => {
		await nonRoutable.goToFooButton.click();

		// should not add history records to the main history
		expect(await main.historyLength()).toBe(2);
		expect(await routable.historyLength()).toBe(2);
		expect(await nonRoutable.historyLength()).toBe(2);
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);

		await nonRoutable.goToBarButton.click();
		expect(await main.historyLength()).toBe(2);
		expect(await nonRoutable.historyLength()).toBe(3);
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);

		await nonRoutable.back();
		await nonRoutable.back();
		expect(await main.historyLength()).toBe(2);
		expect(await nonRoutable.historyLength()).toBe(3);
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/non-routable/);

		await nonRoutable.goToBarButton.click();
		expect(await main.historyLength()).toBe(2);
		// we dropped one history record because the history has been forked and rewritten by the last navigation to /bar
		expect(await nonRoutable.historyLength()).toBe(2);
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	});

	await step('browser back and forward buttons should not affect non-routable fragments', async () => {
		await routable.goToFooButton.click();
		expect(await main.historyLength()).toBe(3);
		expect(await routable.historyLength()).toBe(3);
		expect(await nonRoutable.historyLength()).toBe(2);
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
		expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
		expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
		await nonRoutable.goToBarButton.click();
		expect(await main.historyLength()).toBe(3);
		expect(await routable.historyLength()).toBe(3);
		expect(await nonRoutable.historyLength()).toBe(3);

		// history.forward() and history.back() in a non-routable fragment should not affect main navigation
		await routable.back();
		expect(await main.historyLength()).toBe(3);
		expect(await routable.historyLength()).toBe(3);
		expect(await nonRoutable.historyLength()).toBe(3);
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await routable.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await nonRoutable.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	});
});
