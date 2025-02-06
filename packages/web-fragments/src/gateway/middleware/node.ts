import { IncomingMessage, ServerResponse } from 'http';
import { FragmentGateway } from 'web-fragments/gateway';
import { HTMLRewriter } from 'htmlrewriter';
import type { FragmentMiddlewareOptions, FragmentConfig } from '../utils/types';
// import fs from 'fs';
// import path from 'path';
import stream from 'stream';

const NodeReadable = stream?.Readable ?? (class {} as typeof import('stream').Readable);
const NodePassThrough = stream?.PassThrough ?? (class {} as typeof import('stream').PassThrough);
// const pipeline = stream?.pipeline ?? ((...args: any[]) => {});

interface MatchedFragment {
	upstream: string;
	fragmentId: string;
	prePiercingClassNames: string[];
}

export function getNodeMiddleware(gateway: FragmentGateway, options: FragmentMiddlewareOptions = {}) {
	console.log('### Using Node middleware!!!!!');

	const { additionalHeaders = {}, mode = 'development' } = options;

	return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
		const reqUrl = new URL('http://foo.bar' + req.url);
		console.log('[Debug Info | Local request]:', reqUrl.href);

		// handle service worker requests -this may not be needed in the future
		const userAgent = req.headers['user-agent'] || '';
		if (req.headers['service-worker'] || userAgent.includes('ServiceWorker')) {
			console.log('[Debug Info | Service Worker Request Detected]');
			res.setHeader('Service-Worker-Allowed', '/');
		}

		if (req.headers['sec-fetch-dest'] === 'script') {
			console.log('[Debug Info | Dynamic script request]', req.url);

			res.setHeader('content-type', 'text/javascript');
			console.log('Sec-Fetch-Dest indicates a script');
		}

		const matchedFragment = gateway.matchRequestToFragment(reqUrl.href);

		if (matchedFragment) {
			console.log('[Debug Info | Matched Fragment]:' + JSON.stringify(matchedFragment));

			// handle the iframe
			if (req.headers['sec-fetch-dest'] === 'iframe') {
				console.log(`[Debug Info]: Request Iframe for: ` + JSON.stringify(matchedFragment));
				res.writeHead(200, { 'content-type': 'text/html' });
				// res.setHeader('content-type', 'text/html');
				res.end('<!doctype html><title>');
				return;
			}

			// fetch the fragment only after ensuring route is processed
			const fragmentResponse = await fetchFragment(req, matchedFragment);

			// process fragment embedding only if it's a document request
			if (req.headers['sec-fetch-dest'] === 'document') {
				console.log('[Debug Info | Document request]');
				try {
					if (!fragmentResponse.ok) throw new Error(`Fragment response not ok: ${fragmentResponse.status}`);

					res.setHeader('content-type', 'text/html');

					next();
					// The block below is a remanent of the original code for express that we were
					// meant to replace with next() but we are keeping it here for reference since we have a bug
					// and I am not sure it has nothing to do with next() not being async
					// TODO: investigate
/* 					const currentPagePath = path.resolve(process.cwd(), `dist/index.html`);
					fs.createReadStream(currentPagePath)
					.pipe(embedFragmentIntoHost(fragmentResponse, matchedFragment))
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
		const { endpoint } = fragmentConfig;
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
		const fragmentReqUrl = new URL(request.url!, endpoint);
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

	function embedFragmentIntoHost(
		fragmentResponse: Response,
		fragmentConfig: FragmentConfig,
		// fragmentSrc: string
		) {
		const { fragmentId, prePiercingClassNames } = fragmentConfig;

		const { prefix: fragmentHostPrefix, suffix: fragmentHostSuffix } = fragmentHostInitialization({
			fragmentId,
			// fragmentSrc: fragmentSrc,
			classNames: prePiercingClassNames.join(''),
		})

		const transform = new NodePassThrough();

		const rewrittenResponseBody = new HTMLRewriter()
			.on("head", {
		element(element: any) {
			element.append(gateway.prePiercingStyles, { html: true });
		},
		})
		.on("body", {
		async element(element: any) {
			element.append(fragmentHostPrefix, { html: true });
			// TODO: this should be a stream append rather than buffer to text & append
			//       update once HTMLRewriter is updated
			element.append(await fragmentResponse.text(), { html: true });
			element.append(fragmentHostSuffix, { html: true });
		},
		})
		.transform(new Response(NodeReadable.toWeb(transform) as any)).body;

		NodeReadable.fromWeb(rewrittenResponseBody as any).pipe(transform);

		return transform;
	}

	/* function embedFragmentIntoHost(
		fragmentResponse: Response,
		fragmentConfig: MatchedFragment,
		req: IncomingMessage,
		gateway: FragmentGateway,
	): NodeJS.ReadWriteStream {
		const { fragmentId, prePiercingClassNames } = fragmentConfig;
		const prefix = `<fragment-host class="${prePiercingClassNames.join(' ')}" fragment-id="${fragmentId}" src="${req.url}" data-piercing="true"><template shadowrootmode="open">`;
		const suffix = `</template></fragment-host>`;

		const transformStream = new NodePassThrough();

		const rewrittenResponseBody = new HTMLRewriter()
			.on('head', {
				element(element) {
					element.append(gateway.prePiercingStyles, { html: true });
				},
			})
			.on('body', {
				async element(element) {
					element.append(prefix, { html: true });
					// TODO: this should be a stream append rather than buffer to text & append
					//       update once HTMLRewriter is updated
					element.append(await fragmentResponse.text(), { html: true });
					element.append(suffix, { html: true });
				},
			})
			.transform(new Response(NodeReadable.toWeb(transformStream) as any)).body;

		NodeReadable.fromWeb(rewrittenResponseBody as any).pipe(transformStream);

		return transformStream;
	} */

	// process the fragment response for embedding into the host document
/* 	function processFragmentForReframing(fragmentResponse: Response) {
		console.log('[Debug Info | processFragmentForReframing]');

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
			.transform(fragmentResponse);
	} */

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

// This is a remanent from the original code for express in the demo
// I am keeping it here for reference
// since streams are not fully implemented
/* 
function mergeStreams(...streams: NodeJS.ReadableStream[]) {
	let combined = new NodePassThrough();
	for (let stream of streams) {
		const end = stream === streams.at(-1);
		combined = stream.pipe(combined, { end });
	}
	return combined;
} */

// we should be importing this from utils
// but there are issues with import resolution
function fragmentHostInitialization({
	fragmentId,
	// fragmentSrc,
	classNames,
}: {
	fragmentId: string;
	// fragmentSrc: string;
	classNames: string;
}) {
	return {
		prefix: `<fragment-host class="${classNames}" fragment-id="${fragmentId}" data-piercing="true"><template shadowrootmode="open">`,
		suffix: `</template></fragment-host>`,
	};
}
