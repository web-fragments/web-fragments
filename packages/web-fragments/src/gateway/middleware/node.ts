import { IncomingMessage, ServerResponse } from 'http';
import { FragmentGateway } from 'web-fragments/gateway';
import { HTMLRewriter } from '@worker-tools/html-rewriter/base64';
import fs from 'fs';
import path from 'path';
import type { FragmentMiddlewareOptions, FragmentConfig } from '../utils/types';
// commented it out because I can't import it due to resolution issues in the server at runtime
// TODO: Fix this
// import { fragmentHostInitialization } from '../utils/host-utils';
import stream from 'stream';
import streamWeb from 'stream/web';

const NodeReadable = stream?.Readable ?? (class {} as typeof import('stream').Readable);

export function getNodeMiddleware(gateway: FragmentGateway, options: FragmentMiddlewareOptions = {}) {
	console.log('[Debug Info]: Using NEW Node middleware');

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

					const hostPageReader = fs.createReadStream(currentPagePath);
					// prepare the fragment for reframing
					const preparedFragmentResponse = await prepareFragmentForReframing(fragmentResponse);

					const rewrittenHtmlReadable = await embedFragmentIntoHost(
						hostPageReader,
						preparedFragmentResponse,
						matchedFragment,
					);

					// attach headers before sending the response
					attachForwardedHeaders(res, fragmentResponse, matchedFragment);

					// stream the final transformed content to the client
					rewrittenHtmlReadable.pipe(res);
				} catch (err) {
					console.error('[Error] Error during fragment embedding:', err);
					return renderErrorResponse(err, res);
				}
			} else if (req.headers['sec-fetch-dest'] === 'iframe') {
				// handle the iframe
				console.log(`[Debug Info]: Handling iframe request`);
				res.writeHead(200, { 'content-type': 'text/html' });
				res.end('<!doctype html><title>');
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

		headers.set('sec-fetch-dest', 'empty');
		// TODO: review the name of this header and document it as something fragments can use to render a fake shell in standalone mode vs fragment in the embedded mode.
		headers.set('x-fragment-mode', 'embedded');

		// Do we need this still?
		if (mode === 'development') {
			headers.set('Accept-Encoding', 'gzip');
		}

		const fragmentReqUrl = new URL(request.url!, endpoint);
		const fragmentReq = new Request(fragmentReqUrl, {
			method: request.method,
			headers,
		});

		Object.entries(additionalHeaders).forEach(([name, value]) => {
			fragmentReq.headers.set(name, value as string);
		});

		fragmentReq.headers.forEach((value, key) => {
			console.log('--------- fetch headers: ', key, '=', value);
		});

		return fetch(fragmentReq);
	}

	async function embedFragmentIntoHost(
		hostHtmlReadable: stream.Readable,
		fragmentResponse: Response,
		fragmentConfig: FragmentConfig,
	) {
		const { fragmentId, prePiercingClassNames } = fragmentConfig;
		console.log('[[Debug Info]: Fragment Config]:', { fragmentId, prePiercingClassNames });

		const { prefix: fragmentHostPrefix, suffix: fragmentHostSuffix } = fragmentHostInitialization({
			fragmentId,
			classNames: prePiercingClassNames.join(''),
			content: '',
		});
		console.log('[[Debug Info]: Fragment Host]:', { fragmentHostPrefix, fragmentHostSuffix });

		// cast due to https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/65542
		const webReadableInput: ReadableStream = stream.Readable.toWeb(hostHtmlReadable) as ReadableStream<Uint8Array>;

		// const transformStream = new TransformStream({
		//   transform(chunk, controller) {
		//     const text = chunk.toString();
		//     const upperText = text.toUpperCase();
		//     controller.enqueue(upperText);
		//   }
		// });

		// const webReadableOutput = webReadableInput.pipeThrough(transformStream);
		const html = await fragmentResponse.text();
		const rewrittenResponse = new HTMLRewriter()
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
						classNames: prePiercingClassNames.join(''),
						content: html,
					});
					console.log('[[Debug Info]: Fragment Response]: Received HTML content', typeof html);
					console.log('[[Debug Info]: HTMLRewriter]: Transforming body content');

					element.append(fragmentHost.prefix, { html: true });
					console.log('[[Debug Info]: Prefix appended]:', fragmentHost.prefix);
					console.log('[[Debug Info]: HTML appended]:', typeof html);
					element.append(fragmentHost.suffix, { html: true });
					console.log('[[Debug Info]: Suffix appended]:', fragmentHost.suffix);
				},
			})
			.transform(new Response(webReadableInput));

		const rewrittenBody = rewrittenResponse.body;
		const nodeReadableOuput = stream.Readable.fromWeb(rewrittenBody as streamWeb.ReadableStream);

		console.log('[[Debug Info]: Rewritten Content]: Successfully transformed HTML');

		// console.log('[[Debug Info]: Stream]: Writing completed', rewrittenBody);

		return nodeReadableOuput;
	}

	function renderErrorResponse(err: unknown, response: ServerResponse) {
		response.statusCode = 500;
		response.end(`<p>${err instanceof Error ? err.message : '[Error]: Unknown error occurred.'}</p>`);
	}

	// Function to reframe fragment before embedding
	async function prepareFragmentForReframing(fragmentResponse: Response): Promise<Response> {
		const rewrittenResponse = new HTMLRewriter()
			.on('script', {
				element(element: any) {
					const scriptType = element.getAttribute('type');
					if (scriptType) {
						element.setAttribute('data-script-type', scriptType);
					}
					element.setAttribute('type', 'inert');
				},
			})
			.transform(new Response(fragmentResponse.body, { headers: fragmentResponse.headers }));

		return rewrittenResponse;
	}

	// Function to forward fragment headers to the final response
	function attachForwardedHeaders(res: ServerResponse, fragmentResponse: Response, fragmentConfig: FragmentConfig) {
		const { forwardFragmentHeaders = [] } = fragmentConfig;

		for (const header of forwardFragmentHeaders) {
			const headerValue = fragmentResponse.headers.get(header);
			if (headerValue) {
				res.setHeader(header, headerValue);
			}
		}
	}
}

// we need to remove this and import it from
// packages/web-fragments/src/utils/host-utils.ts
function fragmentHostInitialization({
	fragmentId,
	classNames,
	content,
}: {
	fragmentId: string;
	classNames: string;
	content: string;
}) {
	return {
		prefix: `<fragment-host class="${classNames}" fragment-id="${fragmentId}" data-piercing="true">
		<template shadowrootmode="open">${content}`,
		suffix: `</template></fragment-host>`,
	};
}
