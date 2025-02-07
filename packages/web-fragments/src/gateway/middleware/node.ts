import { IncomingMessage, ServerResponse } from 'http';
import { FragmentGateway } from 'web-fragments/gateway';
import { HTMLRewriter } from 'htmlrewriter';
import fs from 'fs';
import path from 'path';
import type { FragmentMiddlewareOptions, FragmentConfig } from '../utils/types';
import stream from 'stream';

const NodeReadable = stream?.Readable ?? (class {} as typeof import('stream').Readable);
const NodePassThrough = stream?.PassThrough ?? (class {} as typeof import('stream').PassThrough);
const NodeDuplex = stream?.Duplex ?? (class {} as typeof import('stream').Duplex);

export function getNodeMiddleware(gateway: FragmentGateway, options: FragmentMiddlewareOptions = {}) {
    console.log('### Using Node middleware!!!!!');

    const { additionalHeaders = {}, mode = 'development' } = options;

    return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const reqUrl = new URL('http://foo.bar' + req.url);
        console.log('[Debug Info | Local request]:', reqUrl.href);

        const matchedFragment = gateway.matchRequestToFragment(reqUrl.href);

        if (matchedFragment) {
            console.log('[Debug Info | Matched Fragment]:' + JSON.stringify(matchedFragment));

            const fragmentResponse = await fetchFragment(req, matchedFragment);

            if (req.headers['sec-fetch-dest'] === 'document') {
                console.log('[Debug Info | Document request]');
                try {
                    if (!fragmentResponse.ok) throw new Error(`Fragment response not ok: ${fragmentResponse.status}`);

                    res.setHeader('content-type', 'text/html');

					const currentPagePath = path.join(process.cwd(), `dist/${reqUrl.pathname}.html`);
					if (!fs.existsSync(currentPagePath)) {
						throw new Error(`Host page not found at ${currentPagePath}`);
					}
					const duplexStream = await embedFragmentIntoHost(fragmentResponse, matchedFragment);

					fs.createReadStream(currentPagePath)
					.pipe(duplexStream)
					.pipe(res);
                    
                    duplexStream.pipe(res);
                } catch (err) {
                    console.error('[Error] Error during fragment embedding:', err);
                    return renderErrorResponse(err, res);
                }
            } else {
                if (fragmentResponse.body) {
                    res.setHeader('content-type', fragmentResponse.headers.get('content-type') || 'text/plain');
                    NodeReadable.fromWeb(fragmentResponse.body as any).pipe(res);
                } else {
                    console.error('[Error] No body in fragment response');
                    res.statusCode = 500;
                    res.end('<p>Fragment response body is empty.</p>');
                }
            }
        } else {
            return next();
        }
    };

    async function fetchFragment(request: IncomingMessage, fragmentConfig: FragmentConfig): Promise<Response> {
        const { endpoint } = fragmentConfig;
        const protocol = request.headers['x-forwarded-proto'] || 'http';
        const host = request.headers['host'];
        const fetchUrl = new URL(`${protocol}://${host}${request.url}`);
        console.log('[Debug Info | Browser Fetch URL]: ' + fetchUrl);

        const headers = new Headers();

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

        if (mode === 'development') {
            headers.append('Accept-Encoding', 'gzip');
        }

        const fragmentReqUrl = new URL(request.url!, endpoint);
        const fragmentReq = new Request(fragmentReqUrl, {
            method: request.method,
            headers,
        });

        Object.entries(additionalHeaders).forEach(([name, value]) => {
            fragmentReq.headers.set(name, value as string);
        });

        return fetch(fragmentReq);
    }

	async function embedFragmentIntoHost(fragmentResponse: Response, fragmentConfig: FragmentConfig) {
		const { fragmentId, prePiercingClassNames } = fragmentConfig;
		console.log('[------------Debug Info | Fragment Config]:', { fragmentId, prePiercingClassNames });

		const { prefix: fragmentHostPrefix, suffix: fragmentHostSuffix } = fragmentHostInitialization({
			fragmentId,
			classNames: prePiercingClassNames.join(''),
		});
		console.log('[------------Debug Info | Fragment Host]:', { fragmentHostPrefix, fragmentHostSuffix });

		const duplexStream = new NodeDuplex({
			read() {},
			write(chunk, encoding, callback) {
				this.push(chunk, encoding);
				callback();
			}
		});
		const readSide = duplexStream;
		const writeSide = duplexStream;
		console.log('[------------Debug Info | Stream Setup]: Created duplex stream');

		const html = await fragmentResponse.text();
		console.log('[------------Debug Info | Fragment Response]: Received HTML content');

		const rewrittenResponse = new HTMLRewriter()
			.on("head", {
				element(element: any) {
					console.log('[------------Debug Info | HTMLRewriter]: Injecting styles into head');
					element.append(gateway.prePiercingStyles, { html: true });
				},
			})
			.on("body", {
				element(element: any) {
					console.log('[------------Debug Info | HTMLRewriter]: Transforming body content');
					element.append(fragmentHostPrefix, { html: true });
					element.append(html, { html: true });
					element.append(fragmentHostSuffix, { html: true });
				},
			})
			.transform(new Response(html));

		const rewrittenBody = await rewrittenResponse.text();
		console.log('[------------Debug Info | Rewritten Content]: Successfully transformed HTML');

		writeSide.write(rewrittenBody);
		writeSide.end();
		console.log('[------------Debug Info | Stream]: Writing completed', rewrittenBody);

		return readSide;
	}

    function mergeStreams(...streams: NodeJS.ReadableStream[]) {
        let combined = new NodePassThrough();
        for (let stream of streams) {
            const end = stream === streams.at(-1);
            combined = stream.pipe(combined, { end });
        }
        return combined;
    }

    function renderErrorResponse(err: unknown, response: ServerResponse) {
        response.statusCode = 500;
        response.end(`<p>${err instanceof Error ? err.message : 'Unknown error occurred.'}</p>`);
    }
}

function fragmentHostInitialization({ fragmentId, classNames }: { fragmentId: string; classNames: string }) {
    return {
        prefix: `<fragment-host class="${classNames}" fragment-id="${fragmentId}" data-piercing="true"><template shadowrootmode="open">`,
        suffix: `</template></fragment-host>`,
    };
}
