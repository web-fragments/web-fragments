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
		const reqUrl = new URL(req.url!, `http://${req.headers.host}`);
		const body = req.method !== 'GET' && req.method !== 'HEAD' ? await streamToPromise(req) : undefined;
		console.log('[Debug Info | Local request]:', reqUrl.href);

		const matchedFragment = gateway.matchRequestToFragment(reqUrl.href);
		if (matchedFragment) {
			console.log('[Debug Info | Matched Fragment]:', JSON.stringify(matchedFragment));
			const request = new Request(reqUrl.href, {
				method: req.method,
				headers: req.headers as any,
				body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
			});
			const fragmentResponse = await fetchFragment(
				request,
				matchedFragment,
				additionalHeaders as Record<string, string>,
				mode,
			);

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
					const preparedFragmentResponse = await prepareFragmentForReframing(fragmentResponse);
					const rewrittenHtmlReadable = await embedFragmentIntoHost(
						hostPageReader,
						preparedFragmentResponse,
						matchedFragment,
                        gateway
					);

					attachForwardedHeaders(res, fragmentResponse, matchedFragment);
					rewrittenHtmlReadable.pipe(res);
				} catch (err) {
					console.error('[Error] Error during fragment embedding:', err);
					return renderErrorResponse(err);
				}
			} else if (req.headers['sec-fetch-dest'] === 'iframe') {
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
	    gateway: FragmentGateway
	) {
	    const webReadableInput = stream.Readable.toWeb(hostHtmlReadable) as ReadableStream<Uint8Array>;

	    const rewrittenResponse = await rewriteHtmlResponse({
	        hostInput: new Response(webReadableInput),
	        fragmentResponse,
	        fragmentConfig,
	        gateway
	    });
	    return stream.Readable.fromWeb(rewrittenResponse.body as streamWeb.ReadableStream);
	}
}
