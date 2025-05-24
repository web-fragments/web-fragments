import { test, expect } from '@playwright/test';
const { beforeEach, step } = test;
import { failOnBrowserErrors } from '../playwright.utils';

beforeEach(failOnBrowserErrors);

test('DOM querying in fragments', async ({ page }) => {
	await page.goto('/dom-querying/');

	await step('ensure the test harness app loaded', async () => {
		await expect(page.locator('h1')).toHaveText('WF Playground: DOM-querying');
	});

	const fragment = page.locator('web-fragment');

	await step('ensure the dom-querying fragment renders', async () => {
		await expect(fragment.locator('h2')).toHaveText('DOM-querying fragment');
	});

	await step('ensure document.documentElement is patched to return wf-html', async () => {
		await expect(fragment.locator('#document-element-nodename-checkbox')).toBeChecked();
		await expect(fragment.locator('#document-element-tagname-checkbox')).toBeChecked();
		await expect(fragment.locator('#document-element-query-html-checkbox')).toBeChecked();
		await expect(fragment.locator('#document-element-query-wfhtml-checkbox')).toBeChecked();
	});

	await step('ensure document.body is patched to return wf-body', async () => {
		await expect(fragment.locator('#document-body-nodename-checkbox')).toBeChecked();
		await expect(fragment.locator('#document-body-tagname-checkbox')).toBeChecked();
		await expect(fragment.locator('#document-body-query-body-checkbox')).toBeChecked();
		await expect(fragment.locator('#document-body-query-wfbody-checkbox')).toBeChecked();
	});

	await step('ensure document.head is patched to return wf-head', async () => {
		await expect(fragment.locator('#document-head-nodename-checkbox')).toBeChecked();
		await expect(fragment.locator('#document-head-tagname-checkbox')).toBeChecked();
		await expect(fragment.locator('#document-head-query-head-checkbox')).toBeChecked();
		await expect(fragment.locator('#document-head-query-wfhead-checkbox')).toBeChecked();
	});

	await step('ensure document.querySelector() is patched to replace html,body,head elements', async () => {
		await expect(fragment.locator('#child-selector-checkbox')).toBeChecked();
		await expect(fragment.locator('#descendant-selector-checkbox')).toBeChecked();
		await expect(fragment.locator('#next-sibling-selector-checkbox')).toBeChecked();
		await expect(fragment.locator('#class-selector-checkbox')).toBeChecked();
		await expect(fragment.locator('#id-selector-checkbox')).toBeChecked();
	});
});
