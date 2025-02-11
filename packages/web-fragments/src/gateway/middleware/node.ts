import { HTMLRewriter } from 'htmlrewriter';
import { IncomingMessage, ServerResponse } from 'http';
import { FragmentGateway } from 'web-fragments/gateway';
import fs from 'fs';
import path from 'path';
import stream from 'stream';
import streamWeb from 'stream/web';
import {
	fetchFragment,
	fragmentHostInitialization,
	rewriteHtmlResponse,
	prepareFragmentForReframing,
	attachForwardedHeaders,
	renderErrorResponse,
} from '../utils/common-utils';
import type { FragmentMiddlewareOptions, FragmentConfig } from '../utils/types';

const NodeReadable = stream?.Readable ?? (class {} as typeof import('stream').Readable);

/**
 * Converts a Node.js readable stream to a Promise that resolves with a Buffer.
 * @param {IncomingMessage} stream - The incoming request stream.
 * @returns {Promise<Buffer>} - A promise resolving to the complete data as a Buffer.
 */
async function streamToPromise(stream: IncomingMessage): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		stream.on('data', (chunk) => chunks.push(chunk));
		stream.on('end', () => resolve(Buffer.concat(chunks as unknown as Uint8Array[])));
		stream.on('error', reject);
	});
}

/**
 * Creates middleware for handling fragment-based server-side rendering.
 * @param {FragmentGateway} gateway - The fragment gateway instance.
 * @param {FragmentMiddlewareOptions} [options={}] - Optional middleware settings.
 * @returns {Function} - Express-style middleware function.
 */
export function getNodeMiddleware(gateway: FragmentGateway, options: FragmentMiddlewareOptions = {}) {
	console.log('[Debug Info]: Node middleware');
	const { additionalHeaders = {}, mode = 'development' } = options;

	return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
		const originalReqUrl = new URL(req.url!, `http://${req.headers.host}`);
		console.log('[Debug Info | Local request]:', originalReqUrl);

		const matchedFragment = gateway.matchRequestToFragment(originalReqUrl.pathname);

		if (!matchedFragment) {
			console.log('[Debug Info]: No fragment match, calling next()');
			return next();
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
		if (req.headers['sec-fetch-dest'] === 'iframe') {
			console.log(`[Debug Info]: Handling iframe request`);
			res.writeHead(200, { 'content-type': 'text/html' });
			res.end('<!doctype html><title>');
			return;
		}

		console.log('[Debug Info | Matched Fragment]:', JSON.stringify(matchedFragment));
		const body =
			req.method !== 'GET' && req.method !== 'HEAD'
				? ((await stream.Readable.toWeb(req)) as ReadableStream<Uint8Array>)
				: undefined;

		const fragmentResponse = await fetchFragment(
			nodeRequestToWebRequest(req),
			matchedFragment,
			additionalHeaders,
			mode,
		);

		// If this is a document request, we need to fetch the host application
		// and if we get a successful HTML response, we need to rewrite the HTML to embed the fragment inside it
		if (req.headers['sec-fetch-dest'] === 'document') {
			console.log('[Debug Info | Document request]');

			try {
				if (!fragmentResponse.ok) return fragmentResponse;

				res.setHeader('content-type', 'text/html');

				// TODO: temporarily read the file from the fs
				// 			 this should be replaced with reading the ServerResponse
				const currentPagePath = path.join(process.cwd(), `dist/${reqUrl.pathname}.html`);
				if (!fs.existsSync(currentPagePath)) {
					throw new Error(`Host page not found at ${currentPagePath}`);
				}
				const hostPageReadStream = fs.createReadStream(currentPagePath);
				const hostPageReadableStream = stream.Readable.toWeb(hostPageReadStream) as ReadableStream<Uint8Array>;

				

				const preparedFragmentResponse = await prepareFragmentForReframing(fragmentResponse);
				const rewrittenHtmlReadable = await embedFragmentIntoHost(
					hostPageReadableStream,
					preparedFragmentResponse,
					matchedFragment,
					gateway,
				);

				attachForwardedHeaders(res, fragmentResponse, matchedFragment);
				rewrittenHtmlReadable.pipe(res);
			} catch (err) {
				console.error('[Error] Error during fragment embedding:', err);
				return renderErrorResponse(err);
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
	};

	/**
	 * Embeds a fetched fragment into the host HTML document.
	 * @param {stream.Readable} hostHtmlReadable - The readable stream of the host HTML.
	 * @param {Response} fragmentResponse - The response object of the fragment.
	 * @param {FragmentConfig} fragmentConfig - Configuration object for the fragment.
	 * @returns {Promise<stream.Readable>} - A readable stream of the transformed HTML.
	 */
	async function embedFragmentIntoHost(
		hostHtmlReadable: stream.Readable,
		fragmentResponse: Response,
		fragmentConfig: FragmentConfig,
		gateway: FragmentGateway,
	) {
		const webReadableInput = stream.Readable.toWeb(hostHtmlReadable) as ReadableStream<Uint8Array>;

		const rewrittenResponse = await rewriteHtmlResponse({
			hostInput: new Response(webReadableInput),
			fragmentResponse,
			fragmentConfig,
			gateway,
		});
		return stream.Readable.fromWeb(rewrittenResponse.body as streamWeb.ReadableStream);
	}
}

function nodeRequestToWebRequest(nodeReq: IncomingMessage): Request {
	const headers = new Headers();

	for (const [key, value] of Object.entries(nodeReq.headers)) {
		if (Array.isArray(value)) {
			value.forEach((val) => headers.append(key, val));
		} else if (value) {
			headers.append(key, value);
		}
	}

	const body = stream.Readable.toWeb(nodeReq) as ReadableStream<Uint8Array>;

	return new Request(nodeReq.url!, {
		method: nodeReq.method,
		headers: headers,
		body: body,
	});
}
