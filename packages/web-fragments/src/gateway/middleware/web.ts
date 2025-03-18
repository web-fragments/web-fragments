/**
 * The middleware provides support for Web request-response handling using fetch-like behavior, and for Node.js native http request and responses object, including using Connect framework, via the imported adaptor.
 */

import { FragmentGateway, FragmentMiddlewareOptions, FragmentConfig, FragmentGatewayConfig } from '../fragment-gateway';
import { HTMLRewriter } from 'htmlrewriter';

const isNativeHtmlRewriter = HTMLRewriter.toString().endsWith('{ [native code] }');

/**
 * Creates middleware for handling web-based fragment rendering.
 * @param {FragmentGateway} gateway - The fragment gateway instance.
 * @param {FragmentMiddlewareOptions} [options={}] - Optional middleware settings.
 * @returns {Function} - A middleware function for processing web requests.
 */
export function getWebMiddleware(
	gateway: FragmentGateway,
	options: FragmentMiddlewareOptions = {},
): (request: Request, next: () => Promise<Response>) => Promise<Response> {
	const { additionalHeaders = {}, mode = 'development' }: FragmentMiddlewareOptions = options;

	return async (request: Request, next: () => Promise<Response>): Promise<Response> => {
		const matchedFragment = gateway.matchRequestToFragment(new URL(request.url).pathname);

		/**
		 * Handle app shell (legacy app) requests
		 * --------------------------------------
		 *
		 * If this request doesn't match any fragment routes, then send it to the legacy app by calling the next() middleware function.
		 */
		if (!matchedFragment) {
			return await next();
		}

		const requestSecFetchDest = request.headers.get('sec-fetch-dest');

		/**
		 * Handle IFrame request from reframed
		 * ----------------------------
		 *
		 * If this request was initiated by an iframe (via reframed), return a stub document.
		 *
		 * Reframed has to set the iframe's `src` to the fragment URL to have its `document.location` reflect the correct value (and also avoid same-origin policy restrictions).
		 *
		 * However, we don't want the iframe's document to actually contain the fragment's content; we're only using it as an isolated execution context. Returning a stub document here is our workaround to that problem.
		 */
		if (requestSecFetchDest === 'iframe') {
			return new Response('<!doctype html><title>', {
				headers: { 'Content-Type': 'text/html', vary: 'sec-fetch-dest' },
			});
		}

		// Forward the request to the fragment endpoint
		const fragmentResponsePromise =
			// but only if we are about to pierce, or are proxying the request to the fragment endpoint
			matchedFragment.piercing || requestSecFetchDest !== 'document'
				? fetchFragment(request, matchedFragment, additionalHeaders, mode)
				: undefined; //Promise.reject('Unexpected fragment request');

		/**
		 * Handle SSR request from a hard navigation
		 * ----------------------------
		 *
		 * For hard navigations we need to combine the appShell response with fragment response.
		 */
		if (requestSecFetchDest === 'document') {
			// Fetch the app shell response from the origin
			const appShellResponse = await next();

			const isHTMLResponse = appShellResponse.headers.get('content-type')?.startsWith('text/html');

			// If the app shell response is an error or not HTML or we are not piercing, pass it through to the client
			if (!appShellResponse.ok || !isHTMLResponse || !matchedFragment.piercing) {
				appShellResponse.headers.append('vary', 'sec-fetch-dest');
				return appShellResponse;
			}

			// Combine the html responses from the fragment and app shell
			return fragmentResponsePromise!
				.then(function rejectErrorResponses(response: Response) {
					if (response.ok) return response;
					throw response;
				})
				.catch(handleFetchErrors)
				.then(stripDoctype)
				.then(prefixHtmlHeadBody)
				.then(neutralizeScriptTags)
				.then((fragmentResponse) =>
					embedFragmentIntoShellApp({
						appShellResponse,
						fragmentResponse,
						fragmentConfig: matchedFragment,
						gateway: gateway,
					}),
				)
				.then((combinedResponse) => {
					// Append Vary header to prevent BFCache issues
					combinedResponse.headers.append('vary', 'sec-fetch-dest');
					return attachForwardedHeaders(Promise.resolve(combinedResponse), matchedFragment)(combinedResponse);
				})
				.catch(renderErrorResponse);
		}

		const fragmentResponse = await fragmentResponsePromise!;

		/**
		 * Handle SSR request from a soft navigation
		 * ----------------------------
		 *
		 * Simply pass through the fragment response but append the vary header to prevent BFCache issues.
		 */
		if (requestSecFetchDest === 'empty') {
			return prefixHtmlHeadBody(
				new Response(fragmentResponse.body, {
					status: fragmentResponse.status,
					statusText: fragmentResponse.statusText,
					headers: {
						'content-type': fragmentResponse.headers.get('content-type') ?? 'text/plain',
						vary: 'sec-fetch-dest',
					},
				}),
			);
		}

		/**
		 * Handle Asset or Data request
		 * ----------------------------
		 *
		 * Simply pass through the fragment response.
		 */
		return new Response(fragmentResponse.body, {
			status: fragmentResponse.status,
			statusText: fragmentResponse.statusText,
			headers: { 'content-type': fragmentResponse.headers.get('content-type') ?? 'text/plain' },
		});

		async function handleFetchErrors(fragmentResponseOrError: Response | Error) {
			const { endpoint, onSsrFetchError = defaultOnSsrFetchError } = matchedFragment!;

			let onSsrFetchErrorResponse;
			try {
				onSsrFetchErrorResponse = await onSsrFetchError(request, fragmentResponseOrError);
			} catch (error) {
				console.error('onSsrFetchError failed! Using defaultOnSssrFetchError handler instead', { cause: error });
				onSsrFetchErrorResponse = await defaultOnSsrFetchError(request, fragmentResponseOrError);
			}
			const { response, overrideResponse } = onSsrFetchErrorResponse;

			if (overrideResponse) throw response;
			return response;
		}

		async function defaultOnSsrFetchError(fragmentRequest: Request, fragmentResponseOrError: Response | Error) {
			return {
				response: new Response(
					mode === 'development'
						? `<p>Failed to fetch fragment!<br>
										Endpoint: ${matchedFragment!.endpoint}<br>
										Request: ${fragmentRequest.method} ${fragmentRequest.url}<br>
										Response: HTTP ${fragmentResponseOrError instanceof Response ? `${fragmentResponseOrError.status} ${fragmentResponseOrError.statusText}<br>${await fragmentResponseOrError.text()}` : fragmentResponseOrError}
								</p>`
						: '<p>There was a problem fulfilling your request.</p>',
					{ status: 500, headers: [['content-type', 'text/html']] },
				),
				overrideResponse: false,
			};
		}
	};

	/**
	 * Fetches a fragment from a specified endpoint.
	 *
	 * @param {Request} originalRequest - The original request object.
	 * @param {FragmentConfig} fragmentConfig - Configuration containing the fragment endpoint.
	 * @param {Record<string, string>} additionalHeaders - Additional headers to include in the request.
	 * @param {string} mode - The environment mode (e.g., 'development').
	 * @returns {Promise<Response>} - The fetched fragment response.
	 */
	async function fetchFragment(
		originalRequest: Request,
		fragmentConfig: FragmentConfig,
		additionalHeaders: HeadersInit = {},
		mode: string = 'development',
	): Promise<Response> {
		const { endpoint } = fragmentConfig;
		const requestUrl = new URL(originalRequest.url);
		const fragmentEndpoint = new URL(`${requestUrl.pathname}${requestUrl.search}`, endpoint);
		const fetchingToPierce = originalRequest.headers.get('sec-fetch-dest') === 'document';

		// if we are about to pierce a fragment, drop headers that apply only to the overall document request
		if (fetchingToPierce) {
			originalRequest.headers.delete('if-none-match');
			originalRequest.headers.delete('if-modified-since');
		}

		// TODO: add timeout handling
		//const abortController = new AbortController();
		//const timeoutTimer = abortIfSlow && setTimeout(() => abortController.abort(), 1_500);

		const fragmentReq = new Request(fragmentEndpoint, originalRequest);

		// forward the original protocol and host info to the fragment endpoint
		fragmentReq.headers.set(
			'x-forwarded-proto',
			originalRequest.headers.get('x-forwarded-proto') || requestUrl.protocol.slice(0, -1),
		);
		fragmentReq.headers.set('x-forwarded-host', originalRequest.headers.get('x-forwarded-host') || requestUrl.host);

		// attach additionalHeaders to fragment request
		Object.entries(additionalHeaders).forEach(([name, value]) => {
			fragmentReq.headers.set(name, value);
		});

		// Note: we don't want to forward the sec-fetch-dest since we usually need
		//       custom logic so that we avoid returning full htmls if the header is
		//       not set to 'document'
		fragmentReq.headers.set('sec-fetch-dest', 'empty');

		// Add a header for signaling embedded mode
		fragmentReq.headers.set('x-fragment-mode', 'embedded');

		if (mode === 'development') {
			// brotli is not currently supported during local development (with `wrangler (pages) dev`)
			// so we set the accept-encoding to gzip to avoid problems with it
			// TODO: we should likely move this to additionalHeaders or something similar as it is wrangler/application specific.
			fragmentReq.headers.set('Accept-Encoding', 'gzip');
		}

		return fetch(fragmentReq);

		// TODO: add timeout handling
		// return fetch(fragmentReq, { signal: abortController.signal }).finally(
		// 	() => timeoutTimer && clearTimeout(timeoutTimer),
		// );
	}

	/**
	 * Embeds a fetched fragment into the host HTML document.
	 * @param {Response} hostResponse - The response object of the host HTML.
	 * @param {FragmentConfig} fragmentConfig - Configuration object for the fragment.
	 * @returns {Function} - A function that processes and integrates the fragment response.
	 */
	async function embedFragmentIntoShellApp({
		appShellResponse,
		fragmentResponse,
		fragmentConfig,
		gateway,
	}: {
		appShellResponse: Response;
		fragmentResponse: Response;
		fragmentConfig: FragmentConfig;
		gateway: FragmentGatewayConfig;
	}) {
		const { fragmentId, piercingClassNames = [] } = fragmentConfig;

		// Native HTMLRewriter now supports appending/merging of streams directly, so we don't need to block the rewriting
		// until we have the full fragment content. This improves performance.
		// See: https://github.com/web-fragments/web-fragments/pull/104
		//
		// Since the wasm HTMLRewriter doesn't have this feature yet, so we need to split the implementation into two for now.
		if (isNativeHtmlRewriter) {
			return new HTMLRewriter()
				.on('head', {
					element(element) {
						element.append(gateway.piercingStyles ?? '', { html: true });
					},
				})
				.on('body', {
					async element(element) {
						(element.append as any as (content: ReadableStream, options: { html: boolean }) => void)(
							asReadableStream`
								<web-fragment-host class="${piercingClassNames.join(' ')}" fragment-id="${fragmentId}" data-piercing="true">
									<template shadowrootmode="open">${fragmentResponse.body ?? ''}</template>
								</web-fragment-host>`,
							{ html: true },
						);
					},
				})
				.transform(appShellResponse);
		} else {
			const fragmentContent = await fragmentResponse.text();

			return new HTMLRewriter()
				.on('head', {
					element(element) {
						element.append(gateway.piercingStyles ?? '', { html: true });
					},
				})
				.on('body', {
					element(element) {
						element.append(
							`<web-fragment-host class="${piercingClassNames.join(' ')}" fragment-id="${fragmentId}" data-piercing="true"><template shadowrootmode="open">${fragmentContent}</template></web-fragment-host>`,
							{ html: true },
						);
					},
				})
				.transform(appShellResponse);
		}
	}
}

/**
 * Strips <!doctype> from the response body.
 *
 * Nested doctype tags might cause some browsers to complain or choke (e.g. Firefox in some cases).
 *
 * Browsers don't materialize this tag in the DOM anyway so it should be ok to strip them (if it's nested within other elements).
 *
 * HTMLRewriter doesn't support modifying the doctype tag, so we strip it manually here.
 *
 * @param fragmentResponse
 * @returns
 */
export function stripDoctype(fragmentResponse: Response): Response {
	let firstChunk = true;

	const rewrittenBody = fragmentResponse.body
		?.pipeThrough(new TextDecoderStream())
		.pipeThrough(
			new TransformStream({
				transform(chunk, controller) {
					// it's highly unlikely that the first chunk won't contain the full doctype
					// so we don't need to bother buffering the chunks and instead can just check the first one
					if (firstChunk) {
						firstChunk = false;
						chunk = chunk.replace(/<!doctype[^>]*>/i, '');
					}

					controller.enqueue(chunk);
				},
			}),
		)
		.pipeThrough(new TextEncoderStream());
	return new Response(rewrittenBody, fragmentResponse);
}

/**
 * Rewrites html so that any <html>, <head>, and <body> tags are replaced with <wf-html>, <wf-head>, and <wf-body> tags.
 *
 * DOM doesn't allow duplicates of these three elements in the document, and the main document already contains them.
 *
 * We need to replace these tags, to prevent the DOM from silently dropping them when the content is added to the main document.
 *
 * @param {Response} fragmentResponse response to rewrite
 * @returns {Response} rewritten response
 */
export function prefixHtmlHeadBody(fragmentResponse: Response): Response {
	return new HTMLRewriter()
		.on('html', {
			element(element: any) {
				element.tagName = 'wf-html';
			},
		})
		.on('head', {
			element(element: any) {
				element.tagName = 'wf-head';
			},
		})
		.on('body', {
			element(element: any) {
				element.tagName = 'wf-body';
			},
		})
		.transform(new Response(fragmentResponse.body, fragmentResponse));
}

/**
 * Rewrites html so that any script tags remain inert and don't execute.
 *
 * @param {Response} fragmentResponse response to rewrite
 * @returns {Response} rewritten response
 */
export function neutralizeScriptTags(fragmentResponse: Response): Response {
	return new HTMLRewriter()
		.on('script', {
			element(element: any) {
				const scriptType = element.getAttribute('type');
				if (scriptType) {
					element.setAttribute('data-script-type', scriptType);
				}
				element.setAttribute('type', 'inert');
			},
		})
		.transform(new Response(fragmentResponse.body, fragmentResponse));
}

/**
 * Attaches forwarded headers to a response.
 * @param {Promise<Response>} fragmentResponse - The response object of the fragment.
 * @param {FragmentConfig} fragmentConfig - Configuration object for the fragment.
 * @returns {Function} - A function that processes and integrates the fragment response.
 */
function attachForwardedHeaders(fragmentResponse: Promise<Response>, fragmentConfig: FragmentConfig) {
	return async (response: Response) => {
		const fragmentHeaders = (await fragmentResponse).headers;
		const { forwardFragmentHeaders = [] } = fragmentConfig;

		for (const header of forwardFragmentHeaders) {
			response.headers.append(header, fragmentHeaders.get(header) || '');
		}

		return response;
	};
}

/**
 * Renders an error response with a status of 500.
 *
 * @param {Response | Error} err - The error to handle.
 * @returns {Response} - The error response.
 */
function renderErrorResponse(err: Response | Error): Response {
	if (err instanceof Response) return err;
	console.error('WF Gateway Internal Server Error\n', err);
	return new Response('WF Gateway Internal Server Error', {
		status: 500,
		headers: { 'Content-Type': 'text/html' },
	});
}

/**
 * A tagged template that produces a ReadableStream of its content.
 * It supports interpolating other ReadableStreams, which allows you
 * to easily wrap streams with text or combine multiple streams, etc.
 *
 * @example
 * const wrappedBody = asReadableStream`<template>${response.body}</template>`;
 * const combinedStream = asReadableStream`${stream1}${stream2}`;
 */
export function asReadableStream(strings: TemplateStringsArray, ...values: Array<string | number | ReadableStream>) {
	return new ReadableStream({
		async start(controller) {
			try {
				for (let i = 0; i < strings.length; i++) {
					if (strings[i]) {
						controller.enqueue(new TextEncoder().encode(strings[i]));
					}

					if (i < values.length) {
						const value = values[i];

						if (value instanceof ReadableStream) {
							const reader = value.getReader();

							while (true) {
								const { done, value: chunk } = await reader.read();
								if (done) break;
								controller.enqueue(chunk);
							}
						} else {
							const stringValue = String(value);
							if (stringValue) {
								controller.enqueue(new TextEncoder().encode(stringValue));
							}
						}
					}
				}
			} catch (error) {
				controller.error(error);
			}
			controller.close();
		},
	});
}
