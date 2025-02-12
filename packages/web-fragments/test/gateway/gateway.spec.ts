import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FragmentGateway } from '../../src/gateway/fragment-gateway';
import { getNodeMiddleware } from '../../src/gateway/middleware/node';
import { getWebMiddleware } from '../../src/gateway/middleware/web';
import connect from 'connect';
import http from 'node:http';
import stream from 'node:stream';
import streamWeb from 'node:stream/web';

// comment out some environments if you want to focus on testing just one or a few
const environments = [];
environments.push('web');
environments.push('connect');

for (const environment of environments) {
	describe(`${environment} middleware`, () => {
		/**
		 * @param request A request to test
		 * @param hostResponse A response that should be served as if it came from the legacy host
		 */
		let testRequest: (request: Request, hostResponse?: Response) => Promise<Response>;
		let server: http.Server;

		it(`should pass through the host response if the request doesn't match a fragment`, async () => {
			const response = await testRequest(new Request('http://localhost/'), new Response('hello world'));
			expect(response.status).toBe(200);
			expect(await response.text()).toBe('hello world');

			const response2 = await testRequest(new Request('http://localhost/baz'), new Response('hello moon'));
			expect(response2.status).toBe(200);
			expect(await response2.text()).toBe('hello moon');
		});

		it('should match a fragment and return html that combines the host and fragment payloads', async () => {
			mockFragmentFooResponse('/foo', new Response('<p>foo fragment</p>'));

			const response = await testRequest(
				new Request('http://localhost/foo', { headers: { 'sec-fetch-dest': 'document' } }),
				new Response('<html><body>legacy host content</body></html>', { headers: { 'content-type': 'text/html' } }),
			);
			expect(response.status).toBe(200);
			expect(await response.text()).toBe(
				`<html><body>legacy host content<fragment-host class="foo" fragment-id="fragmentFoo" data-piercing="true"><template shadowrootmode="open"><p>foo fragment</p></template></fragment-host></body></html>`,
			);

			mockFragmentBarResponse('/bar', new Response('<p>bar fragment</p>'));

			const response2 = await testRequest(
				new Request('http://localhost/bar', { headers: { 'sec-fetch-dest': 'document' } }),
				new Response('<html><body>legacy host content</body></html>', { headers: { 'content-type': 'text/html' } }),
			);
			expect(response2.status).toBe(200);
			expect(await response2.text()).toBe(
				`<html><body>legacy host content<fragment-host class="bar" fragment-id="fragmentBar" data-piercing="true"><template shadowrootmode="open"><p>bar fragment</p></template></fragment-host></body></html>`,
			);
		});

		beforeEach(async () => {
			const fragmentGateway = new FragmentGateway();
			fragmentGateway.registerFragment({
				fragmentId: 'fragmentFoo',
				prePiercingClassNames: ['foo'],
				routePatterns: ['/foo/:_*', '/_fragment/foo/:_*'],
				endpoint: 'http://foo.test:1234',
				upstream: 'http://foo.test:1234',
				onSsrFetchError: () => ({
					response: new Response('<p>Foo fragment not found</p>', {
						headers: { 'content-type': 'text/html' },
					}),
				}),
			});
			fragmentGateway.registerFragment({
				fragmentId: 'fragmentBar',
				prePiercingClassNames: ['bar'],
				routePatterns: ['/bar/:_*', '/_fragment/bar/:_*'],
				endpoint: 'http://bar.test:4321',
				upstream: 'http://bar.test:4321',
				onSsrFetchError: () => ({
					response: new Response('<p>Bar fragment not found</p>', {
						headers: { 'content-type': 'text/html' },
					}),
				}),
			});

			switch (environment) {
				case 'web': {
					// The web case is simple and doesn't even require an HTTP server.
					// We simply pass around Requests and Responses.
					testRequest = function webFetch(request: Request, hostResponse?: Response): Promise<Response> {
						const webMiddleware = getWebMiddleware(fragmentGateway);

						return webMiddleware(request, function nextFn() {
							if (!hostResponse) {
								throw new Error('No host response provided');
							}
							return Promise.resolve(hostResponse);
						});
					};

					break;
				}
				case 'connect': {
					// We use an actual connect server here with an ephemeral port
					const app = connect();
					app.use(getNodeMiddleware(fragmentGateway));

					let currentHostResponse: Response | undefined;

					app.use(async (req, resp, next) => {
						console.log('fallback middleware');
						if (!currentHostResponse) {
							throw new Error('Origin fallback hit, but no hostResponse defined!');
						}

						resp.writeHead(
							currentHostResponse.status,
							currentHostResponse.statusText,
							Object.fromEntries(Array.from(currentHostResponse.headers.entries())),
						);

						if (currentHostResponse.body) {
							stream.Readable.fromWeb(currentHostResponse.body as streamWeb.ReadableStream<any>).pipe(resp);
						} else {
							resp.end();
						}
					});

					// Start server
					server = http.createServer(app);

					let serverStarted = new Promise((resolve) => {
						server.listen(() => {
							console.debug(`Server running at http://localhost:${server.address().port}`);
							resolve(void 0);
						});
					});

					await serverStarted;

					testRequest = async function (request: Request, hostResponse?: Response): Promise<Response> {
						const newUrl = new URL(new URL(request.url).pathname, `http://localhost:${server.address()!.port}`);

						const newRequest = new Request(newUrl, {
							method: request.method,
							headers: request.headers,
							body: request.body,
							mode: request.mode,
							credentials: request.credentials,
							cache: request.cache,
							redirect: request.redirect,
							referrer: request.referrer,
							integrity: request.integrity,
						});

						currentHostResponse = hostResponse;
						// TODO: remove once we can rewrite node server responses
						// we use global because vi.mock does some fancy code rewriting which makes local variables unavailable
						globalThis.currentHostResponseText = await currentHostResponse?.clone().text();

						// TODO: why not working?
						// fetchMock.dontMockOnce();
						return fetch.unpatchedFetch(newRequest);
					};

					// TODO: remove this once we can rewrite responses in node
					vi.mock('node:fs', async (importOriginal) => {
						const mock = {
							existsSync: function (path: string) {
								return path.endsWith('/dist/foo.html') || path.endsWith('/dist/bar.html');
							},
							createReadStream: function (path: string) {
								if (!(path.endsWith('/dist/foo.html') || path.endsWith('/dist/bar.html'))) {
									throw new Error('Unknown path in mocked createReadStream: ' + path);
								}
								return new stream.Readable({
									async read() {
										this.push(globalThis.currentHostResponseText);
										this.push(null); // Signals end of stream
									},
								});
							},
						};

						return {
							...mock,
							default: mock,
						};
					});

					break;
				}
			}
		});

		afterEach(() => {
			if (server) {
				server.close();
			}
			fetchMock.resetMocks();
			vi.resetModules();
		});
	});
}

function mockFragmentFooResponse(pathname: string, response: Response) {
	fetchMock.doMockOnceIf('http://foo.test:1234' + pathname, response);
}

function mockFragmentBarResponse(pathname: string, response: Response) {
	fetchMock.doMockOnceIf('http://bar.test:4321' + pathname, response);
}
