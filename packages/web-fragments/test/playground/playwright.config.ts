import { defineConfig, devices } from '@playwright/test';

/**
 * In order to reduce test rerun latency while ensuring we don't run tests against stale code, we run the tests as follows:
 * - if tests run via Playwright VSCode extension use `pnpm dev`
 * - if tests run from command line, run against the `pnpm preview`
 */
const VSCODE_MODE = !!process.env.VSCODE_CWD;
const WEBSERVER_COMMAND = VSCODE_MODE ? 'pnpm dev --port 4998' : 'pnpm preview --port 4999';
const WEBSERVER_URL = VSCODE_MODE ? 'http://localhost:4998' : 'http://localhost:4999';

export default defineConfig({
	// Pick up all spec.ts files nested in the test apps
	testDir: '.',
	testMatch: '**/spec.ts',
	testIgnore: 'dist/**',

	outputDir: 'node_modules/.wf-playground-tests/test-results',

	// Run all tests in parallel.
	fullyParallel: true,

	// Fail the build on CI if you accidentally left test.only in the source code.
	forbidOnly: !!process.env.CI,

	// Don't retry when running via VSCode plugin
	retries: VSCODE_MODE ? 0 : 3,

	// Opt out of parallel tests on CI.
	workers: process.env.CI ? 1 : undefined,

	// Reporter to use
	reporter: [['html', { outputFolder: 'node_modules/.wf-playground-tests/playwright-report' }]],

	use: {
		// Base URL to use in actions like `await page.goto('/')`.
		baseURL: WEBSERVER_URL,

		// Collect trace when retrying the failed test.
		trace: 'on-first-retry',
	},

	// Decrease timeout — we shouldn't need more than ten seconds as everything is local
	timeout: 10_000,

	// Configure projects for major browsers.
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},

		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},
	],

	globalSetup: './playwright.utils.ts',

	// Run your local dev server before starting the tests.
	webServer: {
		command: WEBSERVER_COMMAND,
		url: WEBSERVER_URL,
		reuseExistingServer: false,
	},
});
