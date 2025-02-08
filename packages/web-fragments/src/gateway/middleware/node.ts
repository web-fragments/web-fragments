import { IncomingMessage, ServerResponse } from 'http';
import { FragmentGateway } from 'web-fragments/gateway';
import { HTMLRewriter } from 'htmlrewriter';
import fs from 'fs';
import path, { normalize } from 'path';
import type { FragmentMiddlewareOptions, FragmentConfig } from '../utils/types';
import stream from 'stream';
import streamWeb from 'stream/web';
import { StringDecoder } from 'string_decoder';

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
					
/* 					const hostReader = fs.createReadStream(currentPagePath, { encoding: 'utf8' }); */
// I am initializing the reader as a PassThrough stream to be able to pipe it to the embedFragmentIntoHost function
// to make sure we have a response before we feed it to the writer, since createReadStream is async and PassThrough is sync
                    const hostReader = new stream.PassThrough();
                    fs.createReadStream(currentPagePath, { encoding: 'utf8' })
                        .on('error', (err) => {
                            console.error('[Error] Error reading host page:', err);
                            return renderErrorResponse(err, res);
                        })
                        .pipe(hostReader);


                        function bufferToUTF8Readable(bufferStream: stream.Readable) {
                            const decoder = new StringDecoder('utf8');
                            const transformedStream = new stream.PassThrough();
                            
                            bufferStream.on('data', (chunk) => {
                                transformedStream.write(decoder.write(chunk));
                            });
                            bufferStream.on('end', () => {
                                transformedStream.end(decoder.end());
                            });
                        
                            return transformedStream;
                        }
                        
    /*                 hostReader
                    .on('error', (err) => {
                        console.error('[Error] Error reading host page:', err);
                        return renderErrorResponse(err, res);
                    })
                    .on('data', (chunk) => {
                        console.log('[Debug Info | Host page chunk]:', chunk);
                    })
                    .on('end', () => {
                        console.log('[Debug Info | Host page read]: Completed');
                    }); */
                    const utf8Stream = bufferToUTF8Readable(hostReader);
                    const rewrittenHtmlReadable = await embedFragmentIntoHost(utf8Stream, fragmentResponse, matchedFragment);

					//const rewrittenHtmlReadable = await embedFragmentIntoHost(hostReader, fragmentResponse, matchedFragment);

					rewrittenHtmlReadable.pipe(res);

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

	async function embedFragmentIntoHost(hostReader: stream.Readable, fragmentResponse: Response, fragmentConfig: FragmentConfig) {
		const { fragmentId, prePiercingClassNames } = fragmentConfig;
		console.log('[------------Debug Info | Fragment Config]:', { fragmentId, prePiercingClassNames });

		const { prefix: fragmentHostPrefix, suffix: fragmentHostSuffix } = fragmentHostInitialization({
			fragmentId,
			classNames: prePiercingClassNames.join(''),
            content: '',
		});
		console.log('[------------Debug Info | Fragment Host]:', { fragmentHostPrefix, fragmentHostSuffix });

		// cast due to https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/65542
		const webReadableInput: ReadableStream = stream.Readable.toWeb(hostReader) as ReadableStream<Uint8Array>;

		// const transformStream = new TransformStream({
		//   transform(chunk, controller) {
		//     const text = chunk.toString();
		//     const upperText = text.toUpperCase();
		//     controller.enqueue(upperText);
		//   }
		// });
	
		// const webReadableOutput = webReadableInput.pipeThrough(transformStream);
// sanitizing doesn't work, but leave it here for ref
/*         function sanitizeUTF8(input: string): string {
            const decoder = new TextDecoder('utf-8', { fatal: false });
            const encoder = new TextEncoder();
            return decoder.decode(encoder.encode(input));
        } */
        function escapeHTML(str: string) {
            return str.replace(/[^\x20-\x7E]/g, (char) => `&#${char.codePointAt(0)};`);
        }
        let html = await fragmentResponse.text();
        html = escapeHTML(html);
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
                        
                        const fragmentHost = fragmentHostInitialization({
                            fragmentId,
                            classNames: prePiercingClassNames.join(''),
                            content: html,
                        });
		                console.log('[------------Debug Info | Fragment Response]: Received HTML content', typeof html);
						console.log('[------------Debug Info | HTMLRewriter]: Transforming body content');

						element.append(fragmentHost.prefix, { html: true });
                        console.log('[------------Prefix appended]:', fragmentHost.prefix);
                        console.log('[------------HTML appended]:', typeof(html));
						element.append(fragmentHost.suffix, { html: true });
                        console.log('[------------Suffix appended]:', fragmentHost.suffix);
					},
				})
				.transform(new Response(webReadableInput));
	
	
		const rewrittenBody = rewrittenResponse.body;
        const nodeReadableOuput = stream.Readable.fromWeb(rewrittenBody as streamWeb.ReadableStream<Uint8Array>);
		
		console.log('[------------Debug Info | Rewritten Content]: Successfully transformed HTML');

		console.log('[-----------Debug Info | Stream]: Writing completed');

		return nodeReadableOuput;
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

function fragmentHostInitialization({ fragmentId, classNames, content }: { fragmentId: string; classNames: string, content: string }) {
    return {
        prefix: `<fragment-host class="${classNames}" fragment-id="${fragmentId}" data-piercing="true"><template shadowrootmode="open">`,
        suffix: `${content}</template></fragment-host>`,
    };
}
