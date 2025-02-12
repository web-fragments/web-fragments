import { HTMLRewriter } from 'htmlrewriter';
import type { FragmentConfig, FragmentGatewayConfig } from '../utils/types';
import { ServerResponse } from 'node:http';

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
 * Initializes a fragment host element with given attributes.
 *
 * @param {Object} params - The initialization parameters.
 * @param {string} params.fragmentId - The ID of the fragment.
 * @param {string} params.content - The content of the fragment.
 * @param {string} params.classNames - The class names to be applied to the host.
 * @returns {Object} - The prefix and suffix for embedding the fragment.
 */
export const fragmentHostInitialization = ({
	fragmentId,
	content,
	classNames,
}: {
	fragmentId: string;
	content: string;
	classNames: string;
}) => {
	return {
		prefix: `<fragment-host class="${classNames}" fragment-id="${fragmentId}" data-piercing="true"><template shadowrootmode="open">${content}`,
		suffix: `</template></fragment-host>`,
	};
};

/**
 * Attaches forwarded headers from a fragment response to the main response.
 *
 * @param {Response | ServerResponse} res - The response object to attach headers to.
 * @param {Response} fragmentResponse - The fragment response containing headers.
 * @param {FragmentConfig} fragmentConfig - Configuration specifying which headers to forward.
 */
export function attachForwardedHeaders<ResponseType extends Response | ServerResponse>(
	res: ResponseType,
	fragmentResponse: Response,
	fragmentConfig: FragmentConfig,
): ResponseType {
	const { forwardFragmentHeaders = [] } = fragmentConfig;
	for (const header of forwardFragmentHeaders) {
		const headerValue = fragmentResponse.headers.get(header);
		if (headerValue) {
			if (res instanceof Response) {
				res.headers.append(header, headerValue);
			} else {
				res.setHeader(header, headerValue);
			}
		}
	}
	return res;
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
export async function fetchFragment(
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

	// Add vary header so that we don't have BFCache collision for requests with the same URL
	fragmentReq.headers.set('vary', 'sec-fetch-dest');

	if (mode === 'development') {
		// brotli is not currently supported during local development (with `wrangler (pages) dev`)
		// so we set the accept-encoding to gzip to avoid problems with it
		// TODO: we should likely move this to additionalHeaders or something similar as it is wrangler/application specific.
		fragmentReq.headers.set('Accept-Encoding', 'gzip');
	}

	try {
		const response = await fetch(fragmentReq, { signal });
		clearTimeout(timeout);
		return response;
	} catch (error) {
		return renderErrorResponse(error);
	}
}

/**
 * Renders an error response with a status of 500.
 *
 * @param {unknown} err - The error to handle.
 * @returns {Response} - The error response.
 */
export function renderErrorResponse(err: unknown): Response {
	if (err instanceof Response) return err;
	return new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/html' } });
}

/**
 * Rewrites the HTML response to include the fragment content, using HTMLRewriter
 *
 * @param {Object} params - The parameters for rewriting the response.
 * @param {Response} hostInput - The original response to rewrite.
 * @param {Response} fragmentResponse - The response containing the fragment content.
 * @param {FragmentConfig} fragmentConfig - Configuration specifying how to embed the fragment.
 * @param {FragmentGatewayConfig} gateway - Configuration for the fragment gateway.
 */
export async function rewriteHtmlResponse({
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
