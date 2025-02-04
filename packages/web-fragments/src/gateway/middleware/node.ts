import { IncomingMessage, ServerResponse } from 'http';
import { FragmentGateway } from '../fragment-gateway';
import { HTMLRewriter } from 'htmlrewriter';
import type { FragmentMiddlewareOptions, FragmentConfig } from '../utils/types';
// import fs from 'fs';
// import path from 'path';
import stream from 'stream';


const NodeReadable = stream?.Readable ?? (class {} as typeof import('stream').Readable);
const NodePassThrough = stream?.PassThrough ?? (class {} as typeof import('stream').PassThrough);
const pipeline = stream?.pipeline ?? ((...args: any[]) => {});

interface MatchedFragment {
    upstream: string;
    fragmentId: string;
    prePiercingClassNames: string[];
}

export function getNodeMiddleware(gateway: FragmentGateway, options: FragmentMiddlewareOptions = {}) {
    console.log('### Using Node middleware!!!!!');
    const { additionalHeaders = {}, mode = 'development' } = options;
    console.log(options, '#### middleware options');

    return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const reqUrl = new URL('http://foo.bar' + req.url);
        console.log('[##### Debug Info | matchRequestToFragment Input]:', reqUrl);

        if (req.headers['sec-fetch-dest'] === 'script') {
            console.log('[Debug Info | Dynamic script request]', req.url);

            res.setHeader('content-type', 'text/javascript');
            console.log('Sec-Fetch-Dest indicates a script');
        }
        const matchedFragment = gateway.matchRequestToFragment(reqUrl.href);

        if (matchedFragment) {
            console.log('[Debug Info | Matched Fragment]:' + JSON.stringify(matchedFragment));

            if (req.headers['sec-fetch-dest'] === 'iframe') {
                console.log(`[Debug Info]: Request Iframe for: ` + JSON.stringify(matchedFragment));
                res.setHeader('content-type', 'text/html');
                return res.end('<!doctype html><title>');
            }

            // fetch the fragment only after ensuring route is processed
            const fragmentResponse = await fetchFragment(req, matchedFragment);

            // process fragment embedding only if it's a document request
            if (req.headers['sec-fetch-dest'] === 'document') {
                console.log('[Debug Info | Document request]');
                try {
                    if (!fragmentResponse.ok) throw new Error(`Fragment response not ok: ${fragmentResponse.status}`);

                    res.setHeader('content-type', 'text/html');
                    return next();
                    /* fs
                        .createReadStream(path!.resolve(new URL('../dist/index.html', import.meta.url).pathname))
                        .pipe(embedFragmentSSR(fragmentResponse, matchedFragment, req, gateway))
                        .pipe(res); */
                } catch (err) {
                    console.error('[Error] Error during fragment embedding:', err);
                    return renderErrorResponse(err, res);
                }
            } else {
                // for non-document requests, just pipe the fragment directly
                if (fragmentResponse.body) {
                    res.setHeader('content-type', fragmentResponse.headers.get('content-type') || 'text/plain');
                    const fragmentResponseReadable = NodeReadable.fromWeb(fragmentResponse.body as any);

                    // otherwise just pipe the response back to the client
                    fragmentResponseReadable.pipe(res);
                } else {
                    console.error('[Error] No body in fragment response');
                    res.statusCode = 500;
                    res.end('<p>Fragment response body is empty.</p>');
                }
            }
        } else {
            // if no fragment is matched, default to server handling
            return next();
        }
    };

    // fetch the fragment
    async function fetchFragment(request: IncomingMessage, fragmentConfig: FragmentConfig): Promise<Response> {
        const { upstream } = fragmentConfig;
        const protocol = request.headers['x-forwarded-proto'] || 'http';
        const host = request.headers['host'];
        const pathname = request.url;

        const fetchUrl = new URL(`${protocol}://${host}${pathname}`);
        console.log('[Debug Info | Browser Fetch URL]: ' + fetchUrl);

        const headers = new Headers();

        // Helper function to get request body
        async function getRequestBody(request: IncomingMessage): Promise<string> {
            return new Promise((resolve, reject) => {
                let body = '';
                request.on('data', (chunk) => {
                    body += chunk;
                });
                request.on('end', () => {
                    resolve(body);
                });
                request.on('error', (err) => {
                    reject(err);
                });
            });
        }

        // copy headers from the original request
        if (request.headers) {
            for (const [key, value] of Object.entries(request.headers)) {
                if (Array.isArray(value)) {
                    value.forEach((val) => headers.append(key, val));
                } else if (value) {
                    headers.append(key, value);
                }
            }
        }

        headers.append('sec-fetch-dest', 'empty');
        headers.append('x-fragment-mode', 'embedded');

        // handle local development mode
        if (mode === 'development') {
            headers.append('Accept-Encoding', 'gzip');
        }

        // prepare the fragment request
        const fragmentReqUrl = new URL(request.url!, upstream);
        const fragmentReq = new Request(fragmentReqUrl, {
            method: request.method,
            headers,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? await getRequestBody(request) : undefined,
        });

        // forward additional headers
        Object.entries(additionalHeaders).forEach(([name, value]) => {
            fragmentReq.headers.set(name, value as string);
        });

        const fragmentResponse = await fetch(fragmentReq);

        console.log(
            `[Debug Info | Gateway Fetch Response]: status=${fragmentResponse.status}, content-type=${fragmentResponse.headers.get('content-type')}, url=${fragmentReq.url}`,
        );
        return fragmentResponse;
    }

    function embedFragmentSSR(
        fragmentResponse: Response,
        fragmentConfig: MatchedFragment,
        req: IncomingMessage,
        gateway: FragmentGateway,
    ): NodeJS.ReadWriteStream {
        const { fragmentId, prePiercingClassNames } = fragmentConfig;
        const prefix = `<fragment-host class="${prePiercingClassNames.join(' ')}" fragment-id="${fragmentId}" src="${req.url}" data-piercing="true"><template shadowrootmode="open">`;
        const suffix = `</template></fragment-host>`;

        const transformStream = new NodePassThrough();

        const rewriter = new HTMLRewriter()
            .on('head', {
                element(head) {
                    head.append(gateway.prePiercingStyles, { html: true });
                },
            })
            .on('body', {
                async element(body) {
                    body.append(prefix, { html: true });
                    body.append(await fragmentResponse.text(), { html: true });
                    body.append(suffix, { html: true });
                },
            });

        const fragmentReadable = NodeReadable.from(
            (async function* () {
                const reader = fragmentResponse.body?.getReader();
                if (!reader) return;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    yield value;
                }
            })(),
        );

        pipeline(fragmentReadable, transformStream, (err) => {
            if (err) console.error('HTML rewriting failed:', err);
        });
        

        return transformStream;
    }

    // render an error response if something goes wrong
    function renderErrorResponse(err: unknown, response: ServerResponse) {
        if (err instanceof Error) {
            response.statusCode = 500;
            response.end(`<p>Error: ${err.message}</p>`);
        } else {
            response.statusCode = 500;
            response.end('<p>Unknown error occurred.</p>');
        }
    }
}

function mergeStreams(...streams: NodeJS.ReadableStream[]) {
    let combined = new NodePassThrough();
    for (let stream of streams) {
        const end = stream === streams.at(-1);
        combined = stream.pipe(combined, { end });
    }
    return combined;
}

function fragmentHostInitialization({
    fragmentId,
    fragmentSrc,
    classNames,
}: {
    fragmentId: string;
    fragmentSrc: string;
    classNames: string;
}) {
    return {
        prefix: `<fragment-host class="${classNames}" fragment-id="${fragmentId}" src="${fragmentSrc}" data-piercing="true"><template shadowrootmode="open">`,
        suffix: `</template></fragment-host>`,
    };
}
