import { FragmentGateway } from '../fragment-gateway';
import { fetchFragment, rewriteHtmlResponse, prepareFragmentForReframing, renderErrorResponse } from '../utils/common-utils';
import type { FragmentMiddlewareOptions, FragmentConfig } from '../utils/types';
import type { ServerResponse } from 'http';

/**
 * The Web middleware provides support for Web request-response handling using fetch-like behavior.
 * This is a generic implementation for processing fragments in a web-based environment.
 */

// @ts-ignore
const HTMLRewriter = globalThis.HTMLRewriter;

declare function attachForwardedHeaders(res: Response | ServerResponse, fragmentResponse: Response, fragmentConfig: FragmentConfig): Response;

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
    const { additionalHeaders = {}, mode = 'development' } = options;
    console.log('[Debug Info]: Web middleware');

    return async (req: Request, next: () => Promise<Response>): Promise<Response> => {
        const matchedFragment = gateway.matchRequestToFragment(req);
        console.log('[Debug Info]: matched fragment:', matchedFragment);

        if (matchedFragment) {
            const headers: Record<string, string> = {};
            if (additionalHeaders instanceof Headers) {
                additionalHeaders.forEach((value, key) => { headers[key] = value; });
            } else if (Array.isArray(additionalHeaders)) {
                Object.entries(Object.fromEntries(additionalHeaders)).forEach(([key, value]) => { headers[key] = value; });
            } else if (additionalHeaders) {
                Object.assign(headers, additionalHeaders);
            }

            const fragmentResponse = await fetchFragment(req, matchedFragment, headers, mode);

            if (req.headers.get('sec-fetch-dest') === 'document') {
                const hostResponse = await next();
                const isHTMLResponse = hostResponse.headers.get('content-type')?.startsWith('text/html');

                if (hostResponse.ok && isHTMLResponse) {
                    if (!fragmentResponse) {
                        throw new Error('Fragment response is undefined');
                    }
                    try {
                        if (!fragmentResponse.ok) throw fragmentResponse;
                        const preparedFragment = prepareFragmentForReframing(fragmentResponse);
                        const embeddedFragment = await embedFragmentIntoHost(hostResponse, matchedFragment, gateway)(preparedFragment);
                        return attachForwardedHeaders(embeddedFragment, fragmentResponse, matchedFragment);
                    } catch (error) {
                        return renderErrorResponse(error);
                    }
                }
                return hostResponse;
            }

            if (req.headers.get('sec-fetch-dest') === 'iframe') {
                console.log('[Debug Info]: Handling iframe request detected');
                return new Response('<!doctype html><title>', { headers: { 'Content-Type': 'text/html' } });
            }

            return fragmentResponse;
        } else {
            console.log('[Debug Info]: No fragment match, calling next()');
            try {
                return await next();
            } catch (error) {
                console.error('Error calling next():', error);
                return new Response('Internal Server Error', { status: 500 });
            }
        }
    };

    /**
     * Embeds a fetched fragment into the host HTML document.
     * @param {Response} hostResponse - The response object of the host HTML.
     * @param {FragmentConfig} fragmentConfig - Configuration object for the fragment.
     * @returns {Function} - A function that processes and integrates the fragment response.
     */
    // 
    
    function embedFragmentIntoHost(hostResponse: Response, fragmentConfig: FragmentConfig, gateway: FragmentGateway) {
        return (fragmentResponse: Response) => {
            if (!hostResponse.ok) return hostResponse;
            console.log('---------[Debug Info]: Embedding fragment into host web [common-utils]');
            return rewriteHtmlResponse({
                htmlRewriter: HTMLRewriter,
                hostInput: hostResponse,
                fragmentResponse,
                fragmentConfig,
                gateway
            });
        };
    }
}