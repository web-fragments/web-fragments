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
		const response = await request.response();
		if (!response) {
			throw new Error(`Network request failed for: ${request.url()}\n    error: no response`);
		}
		if (response.status() >= 400) {
			throw new Error(
				`Network request failed or: ${request.url()}` + `\n    status: ${response.status()}` + `\n    body: )`,
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
	const iframeHandle = await fragment.evaluateHandle((element) => element.iframe);
	const context = (await iframeHandle.asElement()!).contentFrame()!;
	expect(context).toBeDefined();
	return context;
}
