import { FragmentGateway } from '../fragment-gateway';
import { fetchFragment, fragmentHostInitialization, prepareFragmentForReframing, renderErrorResponse } from '../utils/common-utils';
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
                        const embeddedFragment = await embedFragmentIntoHost(hostResponse, matchedFragment)(preparedFragment);
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
    function embedFragmentIntoHost(hostResponse: Response, fragmentConfig: FragmentConfig) {
        return (fragmentResponse: Response) => {
            const { fragmentId, prePiercingClassNames } = fragmentConfig;
            console.log('[[Debug Info]: Fragment Config]:', { fragmentId, prePiercingClassNames });

            const { prefix: fragmentHostPrefix, suffix: fragmentHostSuffix } = fragmentHostInitialization({
                fragmentId,
                classNames: prePiercingClassNames.join(''),
                content: '',
            });

            if (!hostResponse.ok) return hostResponse;

            return new HTMLRewriter()
                .on('head', {
                    element(element: any) {
                        console.log('[[Debug Info]: HTMLRewriter]: Injecting styles into head');
                        element.append(gateway.prePiercingStyles, { html: true });
                    },
                })
                .on('body', {
                    async element(element: any) {
                        const fragmentContent = await fragmentResponse.text();
                        const fragmentHost = fragmentHostInitialization({
                            fragmentId,
                            content: fragmentContent,
                            classNames: prePiercingClassNames.join(' '),
                        });
                        console.log('[[Debug Info]: Fragment Response]: Received HTML content', typeof fragmentResponse);
                        console.log('[[Debug Info]: HTMLRewriter]: Transforming body content');

                        if (typeof fragmentHost === 'string') {
                            console.log('[[Debug Info]: HTMLRewriter]: Appending fragment host');
                            element.append(fragmentHost, { html: true });
                        } else {
                            console.log('[[Debug Info]: HTML appended]:', typeof fragmentContent);
                            element.append(fragmentHost.prefix, { html: true });
                            console.log('[[Debug Info]: Prefix appended]:', fragmentHost.prefix);
                            element.append(fragmentHost.suffix, { html: true });
                            console.log('[[Debug Info]: Suffix appended]:', fragmentHost.suffix);
                        }
                    },
                })
                .transform(hostResponse);
        };
    }
}