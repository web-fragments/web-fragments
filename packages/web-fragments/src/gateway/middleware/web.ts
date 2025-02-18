/**
 * The middleware provides support for Web request-response handling using fetch-like behavior, and for Node.js native http request and responses object, including using Connect framework, via the imported adaptor.
 */

import { FragmentGateway } from '../fragment-gateway';
import { HTMLRewriter } from 'htmlrewriter';
import type { FragmentMiddlewareOptions, FragmentConfig, FragmentGatewayConfig } from './types';

/**
 * Initializes a fragment host element with given attributes.
 *
 * @param {Object} params - The initialization parameters.
 * @param {string} params.fragmentId - The ID of the fragment.
 * @param {string} params.content - The content of the fragment.
 * @param {string} params.classNames - The class names to be applied to the host.
 * @returns {Object} - The prefix and suffix for embedding the fragment.
 */
const fragmentHostInitialization = ({
	fragmentId,
	content,
	classNames,
}: {
	fragmentId: string;
	content: string;
	classNames: string;
}): { prefix: string; suffix: string } => {
	return {
		prefix: `<fragment-host class="${classNames}" fragment-id="${fragmentId}" data-piercing="true"><template shadowrootmode="open">${content}`,
		suffix: `</template></fragment-host>`,
	};
};

/**
 * Prepares a fragment response for reframing by modifying script elements.
 *
 * @param {Response} fragmentResponse - The response containing the fragment.
 * @returns {Response} - The transformed response with inert scripts.
 */
export function prepareFragmentForReframing(fragmentResponse: Response): Response {
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
 * Creates middleware for handling web-based fragment rendering.
 * @param {FragmentGateway} gateway - The fragment gateway instance.
 * @param {FragmentMiddlewareOptions} [options={}] - Optional middleware settings.
 * @returns {Function} - A middleware function for processing web requests.
 */
export function getWebMiddleware(
	gateway: FragmentGateway,
	options: FragmentMiddlewareOptions = {},
): (req: Request, next: () => Promise<Response>) => Promise<Response> {
	const { additionalHeaders = {}, mode = 'development' }: FragmentMiddlewareOptions = options;

	console.log('[Debug Info]: Web middleware');

	return async (req: Request, next: () => Promise<Response>): Promise<Response> => {
		console.log('[Debug Info]: Web middleware request:', new URL(req.url).pathname);
		const matchedFragment = gateway.matchRequestToFragment(new URL(req.url).pathname);
		console.log('[Debug Info]: matched fragment:', matchedFragment);

		if (!matchedFragment) {
			console.log('[Debug Info]: No fragment match, calling next()');
			try {
				return await next();
			} catch (error) {
				console.error('Error calling next():', error);
				return renderErrorResponse(error);
			}
		}

		// If this request was initiated by an iframe (via reframed),
		// return a stub document.
		//
		// Reframed has to set the iframe's `src` to the fragment URL to have
		// its `document.location` reflect the correct value
		// (and also avoid same-origin policy restrictions).
		// However, we don't want the iframe's document to actually contain the
		// fragment's content; we're only using it as an isolated execution context.
		// Returning a stub document here is our workaround to that problem.
		if (req.headers.get('sec-fetch-dest') === 'iframe') {
			console.log('[Debug Info]: Handling iframe request detected');
			return new Response('<!doctype html><title>', {
				headers: { 'Content-Type': 'text/html', vary: 'sec-fetch-dest' },
			});
		}

		const fragmentResponse = await fetchFragment(req, matchedFragment, additionalHeaders, mode);

		// If this is a document request, we need to fetch the host application
		// and if we get a successful HTML response, we need to rewrite the HTML to embed the fragment inside it
		if (req.headers.get('sec-fetch-dest') === 'document') {
			console.log('sec-fetch-dest==="document" => fetching appShell');
			const appShellResponse = await next();

			// TODO: startsWith needed? should we use this elsewhere too?
			const isHTMLResponse = appShellResponse.headers.get('content-type')?.startsWith('text/html');

			if (appShellResponse.ok && isHTMLResponse) {
				try {
					// if (!fragmentResponse.ok) return fragmentResponse;
					Promise.resolve(fragmentResponse)
						.then(handleFetchError)
						.then(prepareFragmentForReframing)
						.then((preparedFragment) =>
							embedFragmentIntoShellApp({
								hostInput: appShellResponse,
								fragmentResponse: preparedFragment,
								fragmentConfig: matchedFragment,
								gateway: gateway,
							}),
						)
						.then((embeddedFragment) => {
							// Append Vary header to prevent BFCache issues
							embeddedFragment.headers.append('vary', 'sec-fetch-dest');
							return attachForwardedHeaders(Promise.resolve(embeddedFragment), matchedFragment)(embeddedFragment);
						})
						.catch(handleFetchError);
					// Append Vary header to prevent BFCache issues
					// embeddedFragment.headers.append('vary', 'sec-fetch-dest');
					// return await attachForwardedHeaders(Promise.resolve(embeddedFragment), matchedFragment)(embeddedFragment);
				} catch (error) {
					return renderErrorResponse(error);
				}
			}
			return appShellResponse;
		}

		// Append Vary header to prevent BFCache issues.
		// We can't just append because the response is immutable
		// see: https://github.com/whatwg/fetch/issues/608#issuecomment-332462271
		// const fragmentResponseWithHeaders = new Response(fragmentResponse.body, fragmentResponse);
		// fragmentResponseWithHeaders.headers.set('vary', 'sec-fetch-dest');
		const finalHeaders = new Headers({
			vary: 'sec-fetch-dest',
			'content-type': fragmentResponse.headers.get('content-type') ?? 'text/plain',
			//'transfer-encoding': '',
		});

		console.log('returning response');
		return new Response(fragmentResponse.body, {
			status: fragmentResponse.status,
			statusText: fragmentResponse.statusText,
			headers: finalHeaders,
		});
		//return fragmentResponseWithHeaders;
		//return fragmentResponse;
	};

	function handleFetchError(fragmentResponse: Response): Response {
		if (!fragmentResponse.ok) return fragmentResponse;
		return new Response('No error detected', { status: 200 });
	}

	/**
	 * Fetches a fragment from a specified endpoint.
	 *
	 * @param {Request} req - The original request object.
	 * @param {FragmentConfig} fragmentConfig - Configuration containing the fragment endpoint.
	 * @param {Record<string, string>} additionalHeaders - Additional headers to include in the request.
	 * @param {string} mode - The environment mode (e.g., 'development').
	 * @returns {Promise<Response>} - The fetched fragment response.
	 */
	async function fetchFragment(
		req: Request,
		fragmentConfig: FragmentConfig,
		additionalHeaders: HeadersInit = {},
		mode: string = 'development',
	): Promise<Response> {
		const { endpoint } = fragmentConfig;
		const requestUrl = new URL(req.url);
		const fragmentEndpoint = new URL(`${requestUrl.pathname}${requestUrl.search}`, endpoint);

		const controller = new AbortController();
		const signal = controller.signal;
		const timeout = setTimeout(() => controller.abort(), 5000);

		const fragmentReq = new Request(fragmentEndpoint, req);

		// attach additionalHeaders to fragment request
		Object.entries(additionalHeaders).forEach(([name, value]) => {
			fragmentReq.headers.set(name, value);
		});

		// Note: we don't want to forward the sec-fetch-dest since we usually need
		//       custom logic so that we avoid returning full htmls if the header is
		//       not set to 'document'
		fragmentReq.headers.set('sec-fetch-dest', 'empty');

		// Add a header for signalling embedded mode
		fragmentReq.headers.set('x-fragment-mode', 'embedded');

		if (mode === 'development') {
			// brotli is not currently supported during local development (with `wrangler (pages) dev`)
			// so we set the accept-encoding to gzip to avoid problems with it
			// TODO: we should likely move this to additionalHeaders or something similar as it is wrangler/application specific.
			fragmentReq.headers.set('Accept-Encoding', 'gzip');
		}

		try {
			console.log('[Debug info | fetchFragment] fetching:', fragmentReq.url.toString());
			const response = await fetch(fragmentReq, { signal });
			clearTimeout(timeout);
			return response;
		} catch (error) {
			return renderErrorResponse(error, fragmentReq);
		}
	}

	/**
	 * Renders an error response with a status of 500.
	 *
	 * @param {unknown} err - The error to handle.
	 * @returns {Response} - The error response.
	 */
	function renderErrorResponse(err: unknown, req?: Request): Response {
		console.log('WF Gateway Internal Server Error\n', err, req);
		if (err instanceof Response) return err;
		return new Response('WF Gateway Internal Server Error\n' + err, {
			status: 500,
			headers: { 'Content-Type': 'text/html' },
		});
	}

	/**
	 * Embeds a fetched fragment into the host HTML document.
	 * @param {Response} hostResponse - The response object of the host HTML.
	 * @param {FragmentConfig} fragmentConfig - Configuration object for the fragment.
	 * @returns {Function} - A function that processes and integrates the fragment response.
	 */
	async function embedFragmentIntoShellApp({
		hostInput,
		fragmentResponse,
		fragmentConfig,
		gateway,
	}: {
		hostInput: Response;
		fragmentResponse: Response;
		fragmentConfig: FragmentConfig;
		gateway: FragmentGatewayConfig;
	}) {
		const { fragmentId, prePiercingClassNames } = fragmentConfig;
		console.log('[[Debug Info]: Fragment Config]:', { fragmentId, prePiercingClassNames });
		// @ts-ignore
		const { prefix: fragmentHostPrefix, suffix: fragmentHostSuffix } = fragmentHostInitialization({
			fragmentId,
			classNames: prePiercingClassNames.join(' '),
			content: '',
		});
		const fragmentContent = await fragmentResponse.text();

		return new HTMLRewriter()
			.on('head', {
				element(element: any) {
					console.log('[[Debug Info]: HTMLRewriter]: Injecting styles into head');
					element.append(gateway.prePiercingStyles, { html: true });
				},
			})
			.on('body', {
				element(element: any) {
					const fragmentHost = fragmentHostInitialization({
						fragmentId,
						classNames: prePiercingClassNames.join(' '),
						content: fragmentContent,
					});
					console.log('[[Debug Info]: Fragment Response]: Received HTML content', typeof fragmentContent);
					element.append(fragmentHost.prefix, { html: true });
					element.append(fragmentHost.suffix, { html: true });
				},
			})
			.transform(hostInput);
	}
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

// not sure if we need this anymore? I don't see it used
// did you update?
/**
 * Determines if a request is HTTPS.
 * @param {Request} req - The request object.
 * @returns {boolean} - Whether the request is HTTPS.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto
 */

export const isHttps = (req: Request): boolean => {
	return req.headers.get('x-forwarded-proto') === 'https';
};

/**
 * Determines if a request is a Fetch API Request.
 * @param {IncomingMessage | Request} req - The request object.
 * @returns {boolean} - Whether the request is a Fetch API Request.
 */

export const isFetchRequest = (req: any): req is Request => {
	return typeof req.headers?.get === 'function';
};
