import { test, expect, Locator, Frame } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors, getFragmentContext } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

let mainSection: Locator;
let boundFragment: Locator;
let unboundFragment: Locator;
let boundContext: Frame;
let unboundContext: Frame;
let main: {
	locationHref: Function;
	historyLength: Function;
	popstateCount: Function;
	back: Function;
	forward: Function;
	goToFooButton: Locator;
	goToBarButton: Locator;
};
let bound: {
	locationHref: Function;
	historyLength: Function;
	popstateCount: Function;
	back: Function;
	forward: Function;
	goToFooButton: Locator;
	goToBarButton: Locator;
};

let unbound: {
	locationHref: Function;
	historyLength: Function;
	popstateCount: Function;
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
		locationHref: async () => await page.evaluate(() => location.href),
		historyLength: async () => await page.evaluate(() => history.length),
		popstateCount: async () => await page.locator('#mainPopstate').textContent(),
		back: () => page.evaluate(() => history.back()),
		forward: () => page.evaluate(() => history.forward()),
		goToFooButton: mainSection.locator('button').getByText('go to /foo'),
		goToBarButton: mainSection.locator('button').getByText('go to /bar'),
	};

	boundFragment = page.locator('web-fragment[fragment-id="location-and-history"]');
	unboundFragment = page.locator('web-fragment[fragment-id="unbound"]');

	boundContext = await getFragmentContext(boundFragment);
	unboundContext = await getFragmentContext(unboundFragment);

	bound = {
		locationHref: async () => (await getFragmentContext(boundFragment)).evaluate(() => location.href),
		historyLength: async () => (await getFragmentContext(boundFragment)).evaluate(() => history.length),
		popstateCount: () => boundFragment.locator('#popstate').textContent(),
		back: () => boundContext.evaluate(() => history.back()),
		forward: () => boundContext.evaluate(() => history.forward()),
		goToFooButton: boundFragment.locator('button').getByText('go to /foo'),
		goToBarButton: boundFragment.locator('button').getByText('go to /bar'),
	};

	unbound = {
		locationHref: async () => (await getFragmentContext(unboundFragment)).evaluate(() => location.href),
		historyLength: async () => (await getFragmentContext(unboundFragment)).evaluate(() => history.length),
		popstateCount: () => unboundFragment.locator('#popstate').textContent(),
		back: () => unboundContext.evaluate(() => history.back()),
		forward: () => unboundContext.evaluate(() => history.forward()),
		goToFooButton: unboundFragment.locator('button').getByText('go to /foo'),
		goToBarButton: unboundFragment.locator('button').getByText('go to /bar'),
	};
});

test('location.href initialization', async ({ page }) => {
	await step('ensure the test harness app loaded', async () => {
		await expect(page).toHaveTitle('WF Playground: location-and-history');
		await expect(page.locator('h1')).toHaveText('WF Playground: location-and-history');
	});
	await step('ensure that initial location.href of the main frame is correct', async () => {
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	});
	await step('ensure that initial location.href of the unbound fragment is its src', async () => {
		expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);
	});
	await step('ensure that initial location.href of the bound fragment is the main location.href', async () => {
		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	});
});

test('changing main location.href should only impact the main frame and bound fragment', async () => {
	// go to /foo
	await main.goToFooButton.click();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	// the initiating context should not receive a popstate event, while non-initiating contexts should
	expect(await main.popstateCount()).toBe('0');
	expect(await bound.popstateCount()).toBe('1');
	expect(await unbound.popstateCount()).toBe('0');

	// go to /bar
	await main.goToBarButton.click();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await main.popstateCount()).toBe('0');
	expect(await bound.popstateCount()).toBe('2');
	expect(await unbound.popstateCount()).toBe('0');
});

test('changing location.href from a bound fragment should only impact the main frame and bound fragment', async () => {
	// go to /foo
	await bound.goToFooButton.click();
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	// the initiating context should not receive a popstate event, while non-initiating contexts should
	expect(await main.popstateCount()).toBe('1');
	expect(await bound.popstateCount()).toBe('0');
	expect(await unbound.popstateCount()).toBe('0');

	// go to /bar
	await bound.goToBarButton.click();
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await main.popstateCount()).toBe('2');
	expect(await bound.popstateCount()).toBe('0');
	expect(await unbound.popstateCount()).toBe('0');
});

test('changing unbound location.href should only impact itself and not other fragments or main', async () => {
	// go to /foo
	await unbound.goToFooButton.click();
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);

	// go to /bar
	await unbound.goToBarButton.click();
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
});

test('back and forward via browser buttons or history.forward()/.back() should work correctly after navigation in the main context', async ({
	page,
}) => {
	await main.goToFooButton.click();
	await main.goToBarButton.click();

	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);

	await main.back();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);

	await page.goBack();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);

	await main.forward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);

	await page.goForward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);
});

test('back and forward via browser buttons or history.forward()/.back() should work correctly after navigation in a bound fragment', async ({
	page,
}) => {
	await bound.goToFooButton.click();
	await bound.goToBarButton.click();

	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);

	await main.back();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);

	await page.goBack();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);

	await main.forward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);

	await page.goForward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);

	await bound.back();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);

	await bound.forward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);
});

test('history.forward()/.back() in a unbound fragment should update location and history within the fragment only', async ({
	page,
}) => {
	await unbound.goToFooButton.click();
	await unbound.goToBarButton.click();

	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);

	await unbound.back();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);

	await unbound.forward();
	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
});

test('bfcache should not cause bound fragment to be mistaken for the shell app even though they share the same url', async ({
	page,
	browserName,
}) => {
	await expect(page).toHaveURL(/http:\/\/localhost:\d+\/location-and-history\//);
	await expect(page).toHaveTitle('WF Playground: location-and-history');

	expect(await main.historyLength()).toBe(2);

	await page.goBack();

	await expect(page).toHaveURL('about:blank');
	await expect(page).toHaveTitle('');

	await page.goForward();

	await expect(page).toHaveTitle('WF Playground: location-and-history');
	expect(await page.evaluate(() => document.title)).toBe('WF Playground: location-and-history');

	expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
	expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);
});

test('unbound fragment should not participate in history management', async ({ page }) => {
	expect(await main.historyLength()).toBe(2);
	expect(await bound.historyLength()).toBe(2);
	expect(await unbound.historyLength()).toBe(1);

	await step('unbound fragment can still pushState and replaceState to enable internal routing', async () => {
		await unbound.goToFooButton.click();

		// should not add history records to the main history
		expect(await main.historyLength()).toBe(2);
		expect(await bound.historyLength()).toBe(2);
		expect(await unbound.historyLength()).toBe(2);
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);

		await unbound.goToBarButton.click();
		expect(await main.historyLength()).toBe(2);
		expect(await unbound.historyLength()).toBe(3);
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);

		await unbound.back();
		await unbound.back();
		expect(await main.historyLength()).toBe(2);
		expect(await unbound.historyLength()).toBe(3);
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\/unbound/);

		await unbound.goToBarButton.click();
		expect(await main.historyLength()).toBe(2);
		// we dropped one history record because the history has been forked and rewritten by the last navigation to /bar
		expect(await unbound.historyLength()).toBe(2);
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	});

	await step('browser back and forward buttons should not affect unbound fragments', async () => {
		await bound.goToFooButton.click();
		expect(await main.historyLength()).toBe(3);
		expect(await bound.historyLength()).toBe(3);
		expect(await unbound.historyLength()).toBe(2);
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/foo/);
		expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
		await unbound.goToBarButton.click();
		expect(await main.historyLength()).toBe(3);
		expect(await bound.historyLength()).toBe(3);
		expect(await unbound.historyLength()).toBe(3);

		// history.forward() and history.back() in a unbound fragment should not affect main navigation
		await bound.back();
		expect(await main.historyLength()).toBe(3);
		expect(await bound.historyLength()).toBe(3);
		expect(await unbound.historyLength()).toBe(3);
		expect(await main.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await bound.locationHref()).toMatch(/http:\/\/localhost:\d+\/location-and-history\//);
		expect(await unbound.locationHref()).toMatch(/http:\/\/localhost:\d+\/bar/);
	});
});
