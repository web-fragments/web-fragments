import { Frame, Locator, Page, Request, expect } from '@playwright/test';

export default function globalSetup({ webServer }: { webServer: { command: string; url: string } }) {
	console.log('Starting dev server with: ', webServer.command);
	console.log('         dev server url : ', webServer.url);
}

/**
 * Function to be used in beforeEach hook to fail tests if client-side issues such as exceptions or network errors are detected.
 */
export function failOnBrowserErrors({ page }: { page: Page }) {
	// Abort a test if an exception in the browser is detected
	page.on('pageerror', async (error) => {
		// ignore/allow errors for tests that test error handling
		// wrap in try/catch because page.title() might throw if the test/page already crashed for unexpected reasons.
		try {
			switch (await page.title()) {
				case 'WF Playground: fragment-infinite-recursion-breaker':
				case 'WF Playground: fragment-x-frame-options-deny':
				case 'WF Playground: fragment-csp':
					return;
			}
		} catch (e) {
			// intentionally ignore errors, they will be caught by the test
		}

		// prefix error with [browser] so that it's easier to distinguish from Playwright/Node.js errors
		error.message = `[browser]: ${error.message}`;
		// rewrite stack trace to align it with the filesystem path to make stack frames easier to navigate
		error.stack = error.stack?.replace(/http:\/\/[^\/]*\//g, new URL('../src/', import.meta.url).pathname);
		throw error;
	});

	// Abort a test if an network request fails (e.g. aborted requests)
	page.on('requestfailed', async (request: Request) => {
		//throw new Error(`Network request failed for: ${request.url()}` + `\n    error: ${request.failure()?.errorText})`);
	});

	// Abort a test if a network request fails with HTTP status code >= 400
	page.on('requestfinished', async (request: Request) => {
		try {
			const response = await request.response();
			if (!response) {
				throw new Error(`Network request failed for: ${request.url()}\n    error: no response`);
			}
			if (response.status() >= 400) {
				throw new Error(
					`Network request failed or: ${request.url()}` + `\n    status: ${response.status()}` + `\n    body: )`,
				);
			}
		} catch (e) {
			console.warn(
				`[playwright]: Network request failed for ${request.url()} (referrer: ${request.headers()['referer']})\n`,
				e,
			);
		}
	});

	// Relay console.log messages into terminal but only if running in VSCode
	if (process.env.VSCODE_CWD) {
		page.on('console', async (msg) => {
			console.log('[browser]:', msg);
		});
	}
}

export async function getFragmentContext(fragment: Locator): Promise<Frame> {
	const fragmentId = await fragment.evaluate((element) => element.getAttribute('fragment-id'));
	expect(fragment.page().locator(`iframe[name="wf:${fragmentId}"]`)).toBeAttached();
	const context = fragment.page().frame({ name: `wf:${fragmentId}` })!;
	expect(context).toBeDefined();
	return context;
}
