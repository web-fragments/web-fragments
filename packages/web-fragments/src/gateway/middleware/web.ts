/**
 * The Web middleware provides support for Web request-response handling using fetch-like behavior.
 * This is a generic implementation for processing fragments in a web-based environment.
 */

import { FragmentGateway } from '../fragment-gateway';
import {
	fetchFragment,
	rewriteHtmlResponse,
	prepareFragmentForReframing,
	renderErrorResponse,
	attachForwardedHeaders,
} from '../utils/common-utils';
import type { FragmentMiddlewareOptions, FragmentConfig } from '../utils/types';

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
			const appShellResponse = await next();
			const isHTMLResponse = appShellResponse.headers.get('content-type')?.startsWith('text/html');

			if (appShellResponse.ok && isHTMLResponse) {
				try {
					if (!fragmentResponse.ok) return fragmentResponse;

					const preparedFragment = prepareFragmentForReframing(fragmentResponse);
					const embeddedFragment = await embedFragmentIntoHost(
						appShellResponse,
						matchedFragment,
						gateway,
					)(preparedFragment);
					// Append Vary header to prevent BFCache issues
					embeddedFragment.headers.append('vary', 'sec-fetch-dest');
					return attachForwardedHeaders(embeddedFragment, fragmentResponse, matchedFragment);
				} catch (error) {
					return renderErrorResponse(error);
				}
			}
			return appShellResponse;
		}

		// Append Vary header to prevent BFCache issues
		const fragmentResponseWithHeaders = new Response(fragmentResponse.body, {
			headers: fragmentResponse.headers,
			status: fragmentResponse.status,
			statusText: fragmentResponse.statusText,
		});
		fragmentResponseWithHeaders.headers.set('vary', 'sec-fetch-dest');

		return fragmentResponseWithHeaders;
	};

	/**
	 * Embeds a fetched fragment into the host HTML document.
	 * @param {Response} hostResponse - The response object of the host HTML.
	 * @param {FragmentConfig} fragmentConfig - Configuration object for the fragment.
	 * @returns {Function} - A function that processes and integrates the fragment response.
	 */
	function embedFragmentIntoHost(hostResponse: Response, fragmentConfig: FragmentConfig, gateway: FragmentGateway) {
		return (fragmentResponse: Response) => {
			if (!hostResponse.ok) return hostResponse;
			return rewriteHtmlResponse({
				hostInput: hostResponse,
				fragmentResponse,
				fragmentConfig,
				gateway,
			});
		};
	}
}
