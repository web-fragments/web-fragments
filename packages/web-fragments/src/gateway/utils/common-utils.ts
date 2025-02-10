// import { HTMLRewriter } from '@worker-tools/html-rewriter';
import { HTMLRewriter } from 'htmlrewriter';
import type { FragmentConfig } from '../utils/types';
import { ServerResponse } from 'node:http';
import stream from 'node:stream';

// @ts-ignore
// const HTMLRewriter = globalThis.HTMLRewriter;

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

// export function embedFragmentIntoHost(
//     hostResponse: Response | ReadableStream<Uint8Array>,
//     fragmentResponse: Response,
//     fragmentConfig: FragmentConfig,
//     gateway?: any
// ) {
//     const { fragmentId, prePiercingClassNames } = fragmentConfig;
//     console.log('[[Debug Info]: Fragment Config]:', { fragmentId, prePiercingClassNames });

//     // cast due to https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/65542
//     // const webReadableInput: ReadableStream = stream.Readable.toWeb(hostResponse) as ReadableStream<Uint8Array>;

//     const { prefix: fragmentHostPrefix, suffix: fragmentHostSuffix } = fragmentHostInitialization({
//         fragmentId,
//         classNames: prePiercingClassNames.join(' '),
//         content: '',
//     });

//     return new HTMLRewriter()
//         .on('head', {
//             element(element: any) {
//                 console.log('[[Debug Info]: HTMLRewriter]: Injecting styles into head');
//                 if (gateway) {
//                     element.append(gateway.prePiercingStyles, { html: true });
//                 }
//             },
//         })
//         .on('body', {
//             async element(element: any) {
//                 const fragmentContent = await fragmentResponse.text();
//                 const fragmentHost = fragmentHostInitialization({
//                     fragmentId,
//                     content: fragmentContent,
//                     classNames: prePiercingClassNames.join(' '),
//                 });

//                 element.append(fragmentHost.prefix, { html: true });
//                 element.append(fragmentHost.suffix, { html: true });
//             },
//         })
//         .transform(hostResponse instanceof Response ? hostResponse : new Response(hostResponse));
// }

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
		prefix: `<fragment-host class="${classNames}" "data-attibute-test="new_version" fragment-id="${fragmentId}" data-attribute-piercing="true"><template shadowrootmode="open">${content}`,
		suffix: `</template></fragment-host>`
	};
};


export function attachForwardedHeaders(
    res: Response | ServerResponse,
    fragmentResponse: Response,
    fragmentConfig: FragmentConfig
) {
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
}

// the mode should be configurable
export async function fetchFragment(
    req: Request,
    fragmentConfig: FragmentConfig,
    additionalHeaders: Record<string, string> = {},
    mode: string = 'development'
): Promise<Response> {
    const { endpoint } = fragmentConfig;
    const requestUrl = new URL(req.url);
    const fragmentEndpoint = new URL(`${requestUrl.pathname}${requestUrl.search}`, endpoint);

    const controller = new AbortController();
    const signal = controller.signal;
    const timeout = setTimeout(() => controller.abort(), 5000);

    const fragmentReq = new Request(fragmentEndpoint.toString(), req);

    Object.entries(additionalHeaders).forEach(([name, value]) => {
        fragmentReq.headers.set(name, value);
    });

    fragmentReq.headers.set('sec-fetch-dest', 'empty');
    fragmentReq.headers.set('vary', 'sec-fetch-dest');
    fragmentReq.headers.set('x-fragment-mode', 'embedded');

    if (mode === 'development') {
        fragmentReq.headers.set('Accept-Encoding', 'gzip');
    }

    try {
        const response = await fetch(fragmentReq, { signal });
        clearTimeout(timeout);
        return response;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log('[Debug Info]: Fragment fetch timed out!');
        } else {
            console.error('[Debug Info]: Error fetching fragment:', error);
        }
        throw error;
    }
}

export function renderErrorResponse(err: unknown): Response {
    if (err instanceof Response) return err;
    return new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/html' } });
}
