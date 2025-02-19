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

		describe(`app shell requests`, () => {
			it(`should serve requests from the app shell when there is no fragments match`, async () => {
				mockShellAppResponse(new Response('<p>hello world</p>'));

				const response = await testRequest(new Request('http://localhost/'));

				expect(response.status).toBe(200);
				expect(await response.text()).toBe('<p>hello world</p>');

				// make one more request to a different non-fragment path
				mockShellAppResponse(new Response('<p>hello moon</p>'));

				const response2 = await testRequest(new Request('http://localhost/not-a-fragment-path'));

				expect(response2.status).toBe(200);
				expect(await response2.text()).toBe('<p>hello moon</p>');
			});

			it('should serve an error response from the app shell as is', async () => {
				mockShellAppResponse(new Response('<p>app shell no bueno 😢</p>', { status: 500, statusText: 'no bueno' }));

				const response = await testRequest(new Request('http://localhost/'));

				expect(response.status).toBe(500);
				expect(response.statusText).toBe('no bueno');
				expect(await response.text()).toBe('<p>app shell no bueno 😢</p>');

				// make one more request to a different non-fragment path
				mockShellAppResponse(new Response('<p>does not exist here! 👻</p>', { status: 404 }));

				const response404 = await testRequest(new Request('http://localhost/not-here'));

				expect(response404.status).toBe(404);
				expect(await response404.text()).toBe('<p>does not exist here! 👻</p>');
			});
		});

		describe(`pierced fragment requests`, () => {
			it(`should match a fragment and return html that combines the host and fragment payloads`, async () => {
				mockShellAppResponse(
					new Response('<html><body>legacy host content</body></html>', { headers: { 'content-type': 'text/html' } }),
				);
				mockFragmentFooResponse('/foo', new Response('<p>foo fragment</p>'));

				const response = await testRequest(
					new Request('http://localhost/foo', { headers: { 'sec-fetch-dest': 'document' } }),
				);

				expect(response.status).toBe(200);
				expect(await response.text()).toBe(
					`<html><body>legacy host content<fragment-host class="foo" fragment-id="fragmentFoo" data-piercing="true"><template shadowrootmode="open"><p>foo fragment</p></template></fragment-host></body></html>`,
				);
				expect(response.headers.get('content-type')).toBe('text/html');
				expect(response.headers.get('vary')).toBe('sec-fetch-dest');

				// make one more request to the second fragment path
				mockShellAppResponse(
					new Response(`<html><body>legacy host content</body></html>`, { headers: { 'content-type': 'text/html' } }),
				);
				mockFragmentBarResponse('/bar', new Response('<p>bar fragment</p>'));

				const response2 = await testRequest(
					new Request('http://localhost/bar', { headers: { 'sec-fetch-dest': 'document' } }),
				);

				expect(response2.status).toBe(200);
				expect(await response2.text()).toBe(
					`<html><body>legacy host content<fragment-host class="bar" fragment-id="fragmentBar" data-piercing="true"><template shadowrootmode="open"><p>bar fragment</p></template></fragment-host></body></html>`,
				);
			});

			it(`should append additional headers to the composed response`, async () => {
				fetchMock.doMockIf((request) => {
					if (request.url.toString() === 'http://foo.test:1234/foo') {
						expect(request.headers.get('accept-language')).toBe('sk-SK');
						expect(request.headers.get('x-color-mode')).toBe('dark');
						return true;
					}
					return false;
				}, new Response('<p>foo fragment</p>'));

				const response = await testRequest(
					new Request('http://localhost/foo', { headers: { 'sec-fetch-dest': 'empty' } }),
				);

				expect(response.status).toBe(200);
				expect(await response.text()).toBe('<p>foo fragment</p>');
			});

			it('should serve the pierced fragment even if the the app shell errors', async () => {});
		});

		describe(`fragment iframe requests`, () => {
			it(`should serve a blank html document if a request is made by the iframe[src] element`, async () => {
				mockShellAppResponse(
					new Response('<html><body>legacy host content</body></html>', { headers: { 'content-type': 'text/html' } }),
				);
				mockFragmentFooResponse('/foo', new Response('<p>foo fragment</p>'));

				const response = await testRequest(
					new Request('http://localhost/foo', { headers: { 'sec-fetch-dest': 'iframe' } }),
				);

				expect(response.status).toBe(200);
				expect(await response.text()).toBe(`<!doctype html><title>`);
				expect(response.headers.get('content-type')).toBe('text/html');
				expect(response.headers.get('vary')).toBe('sec-fetch-dest');

				// make one more request to the second fragment path
				mockShellAppResponse(
					new Response('<html><body>legacy host content</body></html>', { headers: { 'content-type': 'text/html' } }),
				);
				mockFragmentBarResponse('/bar', new Response('<p>bar fragment</p>'));

				const response2 = await testRequest(
					new Request('http://localhost/bar', { headers: { 'sec-fetch-dest': 'iframe' } }),
				);

				expect(response2.status).toBe(200);
				expect(await response2.text()).toBe(`<!doctype html><title>`);
				expect(response2.headers.get('content-type')).toBe('text/html');
				expect(response2.headers.get('vary')).toBe('sec-fetch-dest');
			});
		});

		describe(`fragment html and asset requests`, () => {
			it(`should serve a fragment soft navigation request`, async () => {
				mockFragmentFooResponse(
					'/foo/some/path',
					new Response('<p>hello foo world!</p>', { headers: { 'content-type': 'text/html' } }),
				);

				const softNavResponse = await testRequest(
					new Request('http://localhost/foo/some/path', { headers: { 'sec-fetch-dest': 'empty' } }),
				);

				expect(softNavResponse.status).toBe(200);
				expect(await softNavResponse.text()).toBe(`<p>hello foo world!</p>`);
				expect(softNavResponse.headers.get('content-type')).toBe('text/html');
				expect(softNavResponse.headers.get('vary')).toBe('sec-fetch-dest');

				// let's make one more request to the same path but this time with sec-fetch-dest=document to simulate hard navigation
				mockFragmentFooResponse(
					'/foo/some/path',
					new Response('<p>hello foo world!</p>', { headers: { 'content-type': 'text/html' } }),
				);
				mockShellAppResponse(
					new Response('<html><body>legacy host content</body></html>', { headers: { 'content-type': 'text/html' } }),
				);

				const hardNavResponse = await testRequest(
					new Request('http://localhost/foo/some/path', { headers: { 'sec-fetch-dest': 'document' } }),
				);

				expect(hardNavResponse.status).toBe(200);
				expect(await hardNavResponse.text()).toBe(
					`<html><body>legacy host content<fragment-host class="foo" fragment-id="fragmentFoo" data-piercing="true"><template shadowrootmode="open"><p>hello foo world!</p></template></fragment-host></body></html>`,
				);
				expect(hardNavResponse.headers.get('content-type')).toBe('text/html');
				expect(hardNavResponse.headers.get('vary')).toBe('sec-fetch-dest');
			});

			it(`should serve a fragment asset`, async () => {
				// fetch an image from the fooFragment
				mockFragmentFooResponse(
					'/_fragment/foo/image.jpg',
					new Response('lol cat img', { headers: { 'content-type': 'image/jpeg' } }),
				);

				const imgResponse = await testRequest(new Request('http://localhost/_fragment/foo/image.jpg'));

				expect(imgResponse.status).toBe(200);
				expect(await imgResponse.text()).toBe(`lol cat img`);
				expect(imgResponse.headers.get('content-type')).toBe('image/jpeg');

				// fetch a js file from the fooFragment
				mockFragmentFooResponse(
					'/_fragment/foo/jquery.js',
					new Response('globalThis.$ = () => {};', { headers: { 'content-type': 'text/javascript' } }),
				);

				const jsResponse = await testRequest(
					new Request('http://localhost/_fragment/foo/jquery.js', {
						// let's also set the sec-fetch-dest as the browser would
						headers: { 'sec-fetch-dest': 'script' },
					}),
				);
				expect(jsResponse.status).toBe(200);
				expect(await jsResponse.text()).toBe(`globalThis.$ = () => {};`);
				expect(jsResponse.headers.get('content-type')).toBe('text/javascript');

				// fetch a barFragment path
				mockFragmentBarResponse(
					'/_fragment/bar/image.jpg',
					new Response('bar cat img', { headers: { 'content-type': 'image/jpeg' } }),
				);

				const barImgResponse = await testRequest(
					new Request('http://localhost/_fragment/bar/image.jpg', {
						// let's also set the sec-fetch-dest as the browser would
						headers: { 'sec-fetch-dest': 'image' },
					}),
				);

				expect(barImgResponse.status).toBe(200);
				expect(await barImgResponse.text()).toBe(`bar cat img`);
				expect(barImgResponse.headers.get('content-type')).toBe('image/jpeg');
			});
		});

		let server: http.Server;

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
					const webMiddleware = getWebMiddleware(fragmentGateway, {
						additionalHeaders: {
							'accept-language': 'sk-SK',
							'x-color-mode': 'dark',
						},
					});

					// The web case is simple and doesn't even require an HTTP server.
					// We simply pass around Requests and Responses.
					testRequest = function webTestRequest(request: Request): Promise<Response> {
						return webMiddleware(request, function nextFn() {
							const appShellResponse = mockShellAppResponse.getResponse();
							if (!appShellResponse) {
								throw new Error('No app shell response provided, use mockShellAppResponse to set it');
							}
							return Promise.resolve(appShellResponse);
						});
					};

					break;
				}
				case 'connect': {
					// We use an actual connect server here with an ephemeral port
					const app = connect();

					// fragment gateway middleware
					app.use(
						getNodeMiddleware(fragmentGateway, {
							additionalHeaders: {
								'accept-language': 'sk-SK',
								'x-color-mode': 'dark',
							},
						}),
					);

					// fallback middleware to serve the app shell
					app.use(async (req, resp, next) => {
						let appShellResponse = mockShellAppResponse.getResponse();

						if (!appShellResponse) {
							throw new Error('No app shell response provided, use mockShellAppResponse to set it');
						}

						// debugging notes:
						// - this is usually synchronous, but we implemented it in an async way
						// - which means we don't actually write the header before we start piping the body
						resp.writeHead(
							appShellResponse.status,
							appShellResponse.statusText,
							Object.fromEntries(Array.from(appShellResponse.headers.entries())),
						);

						if (appShellResponse.body) {
							stream.Readable.fromWeb(appShellResponse.body as streamWeb.ReadableStream<any>).pipe(resp);
						} else {
							resp.end();
						}
					});

					// Start server
					server = http.createServer(app);

					let serverStarted = new Promise((resolve) => {
						//server.listen(53947, () => {
						server.listen(() => {
							console.debug(`Server running at http://localhost:${server.address()!.port}`);
							resolve(void 0);
						});
					});

					await serverStarted;

					testRequest = async function nodeTestRequest(request: Request): Promise<Response> {
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

						// TODO: why not working?
						// fetchMock.dontMockOnce();
						// fetch(newRequest);
						try {
							return fetch.unpatchedFetch(newRequest);
						} catch (e) {
							console.error('testRequest fetch error', e);
							throw e;
						}
					};

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
			mockShellAppResponse.response = null;
		});
	});
}

function mockFragmentFooResponse(pathname: string, response: Response) {
	fetchMock.doMockIf('http://foo.test:1234' + pathname, response);
}

function mockFragmentBarResponse(pathname: string, response: Response) {
	fetchMock.doMockIf('http://bar.test:4321' + pathname, response);
}

async function mockShellAppResponse(response: Response) {
	mockShellAppResponse.response = response;
}

mockShellAppResponse.getResponse = function (): Response | null {
	const r = mockShellAppResponse.response;
	mockShellAppResponse.response = null;
	return r;
};
