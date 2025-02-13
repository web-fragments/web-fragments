import { FragmentGateway } from 'web-fragments/gateway';
import fs from 'node:fs';
import http, { IncomingMessage } from 'node:http';
import path from 'node:path';
import stream from 'node:stream';
import streamWeb from 'node:stream/web';

import {
	fetchFragment,
	rewriteHtmlResponse,
	prepareFragmentForReframing,
	attachForwardedHeaders,
	renderErrorResponse,
	isHttps,
} from '../utils/common-utils';
import type { FragmentMiddlewareOptions, FragmentConfig } from '../utils/types';

/**
 * Creates middleware for handling fragment-based server-side rendering.
 * @param {FragmentGateway} gateway - The fragment gateway instance.
 * @param {FragmentMiddlewareOptions} [options={}] - Optional middleware settings.
 * @returns {Function} - Connect/Express-style middleware function.
 */
export function getNodeMiddleware(gateway: FragmentGateway, options: FragmentMiddlewareOptions = {}) {
	console.log('[Debug Info]: Node middleware');
	const { additionalHeaders = {}, mode = 'development' } = options;

	return async (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => {
		const originalReqUrl = nodeRequestToUrl(req);
		console.log('[Debug Info | Local request]:', originalReqUrl.toString());

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
			res.writeHead(200, { 'content-type': 'text/html', vary: 'sec-fetch-dest' });
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

		// Append Vary header to prevent BFCache issues
		fragmentResponse.headers.append('vary', 'sec-fetch-dest');

		// If this is a document request, we need to fetch the host application
		// and if we get a successful HTML response, we need to rewrite the HTML to embed the fragment inside it
		if (req.headers['sec-fetch-dest'] === 'document') {
			console.log('[Debug Info | Document request]');

			try {
				if (!fragmentResponse.ok) return fragmentResponse;

				res.setHeader('content-type', 'text/html');
				// Add vary header so that we don't have BFCache collision for requests with the same URL
				res.setHeader('vary', 'sec-fetch-dest');

				// TODO: temporarily read the file from the fs
				// 			 this should be replaced with reading the ServerResponse
				const currentPagePath = path.join(process.cwd(), `dist/${originalReqUrl.pathname}.html`);
				if (!fs.existsSync(currentPagePath)) {
					throw new Error(`Host page not found at ${currentPagePath}`);
				}
				const hostHtmlReadable = fs.createReadStream(currentPagePath);
				const hostHtmlReadableStream = stream.Readable.toWeb(hostHtmlReadable) as ReadableStream<Uint8Array>;

				const preparedFragmentResponse = await prepareFragmentForReframing(fragmentResponse);
				const rewrittenHtmlReadable = await embedFragmentIntoHost(
					hostHtmlReadableStream,
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
			res.statusCode = fragmentResponse.status;
			res.statusMessage = fragmentResponse.statusText;
			fragmentResponse.headers.forEach((value, name) => {
				res.appendHeader(name, value);
			});

			if (fragmentResponse.body) {
				stream.Readable.fromWeb(fragmentResponse.body as any).pipe(res);
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
		hostHtmlReadableStream: ReadableStream<Uint8Array>,
		fragmentResponse: Response,
		fragmentConfig: FragmentConfig,
		gateway: FragmentGateway,
	) {
		const rewrittenResponse = await rewriteHtmlResponse({
			hostInput: new Response(hostHtmlReadableStream),
			fragmentResponse,
			fragmentConfig,
			gateway,
		});
		return stream.Readable.fromWeb(rewrittenResponse.body as streamWeb.ReadableStream);
	}
}

function nodeRequestToWebRequest(nodeReq: http.IncomingMessage): Request {
	const headers = new Headers();

	for (const [key, value] of Object.entries(nodeReq.headers)) {
		if (Array.isArray(value)) {
			value.forEach((val) => headers.append(key, val));
		} else if (value) {
			headers.append(key, value);
		}
	}

	let body;
	if (nodeReq.method !== 'GET' && nodeReq.method !== 'HEAD') {
		body = stream.Readable.toWeb(nodeReq) as ReadableStream<Uint8Array>;
	}

	return new Request(nodeRequestToUrl(nodeReq), {
		method: nodeReq.method,
		headers,
		body,
	});
}

function nodeRequestToUrl(nodeReq: IncomingMessage): URL {
	return new URL(`${isHttps(nodeReq) ? 'https' : 'http'}://${nodeReq.headers.host || 'localhost'}${nodeReq.url}`);
}
