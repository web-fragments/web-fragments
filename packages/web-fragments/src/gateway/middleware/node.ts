import { FragmentGateway } from 'web-fragments/gateway';
import http, { IncomingMessage } from 'node:http';
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
import { getWebMiddleware } from './web';

/**
 * Creates middleware for handling fragment-based server-side rendering.
 * @param {FragmentGateway} gateway - The fragment gateway instance.
 * @param {FragmentMiddlewareOptions} [options={}] - Optional middleware settings.
 * @returns {Function} - Connect/Express-style middleware function.
 */
// export function getNodeMiddleware2(gateway: FragmentGateway, options: FragmentMiddlewareOptions = {}) {
// 	console.log('[Debug Info]: Node middleware');
// 	const { additionalHeaders = {}, mode = 'development' } = options;

// 	return async (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => {
// 		const originalReqUrl = nodeRequestToUrl(req);
// 		console.log('[Debug Info | Local request]:', originalReqUrl.toString());

// 		const matchedFragment = gateway.matchRequestToFragment(originalReqUrl.pathname);

// 		if (!matchedFragment) {
// 			console.log('[Debug Info]: No fragment match, calling next()');
// 			return next();
// 		}

// 		// If this request was initiated by an iframe (via reframed),
// 		// return a stub document.
// 		//
// 		// Reframed has to set the iframe's `src` to the fragment URL to have
// 		// its `document.location` reflect the correct value
// 		// (and also avoid same-origin policy restrictions).
// 		// However, we don't want the iframe's document to actually contain the
// 		// fragment's content; we're only using it as an isolated execution context.
// 		// Returning a stub document here is our workaround to that problem.
// 		if (req.headers['sec-fetch-dest'] === 'iframe') {
// 			console.log(`[Debug Info]: Handling iframe request`);
// 			res.writeHead(200, {
// 				'content-type': 'text/html',
// 				// Add vary header so that we don't have BFCache collision for requests with the same URL
// 				vary: 'sec-fetch-dest',
// 			});
// 			res.end('<!doctype html><title>');
// 			return;
// 		}

// 		console.log('[Debug Info | Matched Fragment]:', JSON.stringify(matchedFragment));
// 		const body =
// 			req.method !== 'GET' && req.method !== 'HEAD'
// 				? ((await stream.Readable.toWeb(req)) as ReadableStream<Uint8Array>)
// 				: undefined;

// 		const fragmentResponse = await fetchFragment(
// 			nodeRequestToWebRequest(req),
// 			matchedFragment,
// 			additionalHeaders,
// 			mode,
// 		);

// 		// If this is a document request, we need to fetch the host application
// 		// and if we get a successful HTML response, we need to rewrite the HTML to embed the fragment inside it
// 		if (req.headers['sec-fetch-dest'] === 'document') {
// 			console.log('[Debug Info | Document request]');

// 			try {
// 				if (!fragmentResponse.ok) return fragmentResponse;

// 				res.setHeader('content-type', 'text/html');
// 				// Add vary header so that we don't have BFCache collision for requests with the same URL
// 				res.setHeader('vary', 'sec-fetch-dest');

// 				const { readableStream: appShellHtmlReadableStream, serverResponse: outgoingServerResponse } =
// 					interceptNodeResponse(res, next);

// 				const preparedFragmentResponse = await prepareFragmentForReframing(fragmentResponse);
// 				const rewrittenHtmlReadable = await embedFragmentIntoHost(
// 					appShellHtmlReadableStream,
// 					preparedFragmentResponse,
// 					matchedFragment,
// 					gateway,
// 				);

// 				attachForwardedHeaders(outgoingServerResponse, fragmentResponse, matchedFragment);

// 				rewrittenHtmlReadable.pipe(outgoingServerResponse);
// 			} catch (err) {
// 				console.error('[Error] Error during fragment embedding:', err);
// 				return renderErrorResponse(err);
// 			}
// 		} else {
// 			res.statusCode = fragmentResponse.status;
// 			res.statusMessage = fragmentResponse.statusText;

// 			const contentType = fragmentResponse.headers.get('content-type');
// 			if (contentType) {
// 				res.setHeader('content-type', contentType);
// 			}

// 			// If the current request comes from a `fetch` call due to soft navigation
// 			if (!req.headers['sec-fetch-dest'] || req.headers['sec-fetch-dest'] === 'empty') {
// 				// Add vary header so that we don't have BFCache collision for requests with the same URL.
// 				res.appendHeader('vary', 'sec-fetch-dest');
// 			}

// 			if (fragmentResponse.body) {
// 				stream.Readable.fromWeb(fragmentResponse.body as any).pipe(res);
// 			}
// 		}
// 	};

// 	/**
// 	 * Embeds a fetched fragment into the host HTML document.
// 	 * @param {stream.Readable} hostHtmlReadable - The readable stream of the host HTML.
// 	 * @param {Response} fragmentResponse - The response object of the fragment.
// 	 * @param {FragmentConfig} fragmentConfig - Configuration object for the fragment.
// 	 * @returns {Promise<stream.Readable>} - A readable stream of the transformed HTML.
// 	 */
// 	async function embedFragmentIntoHost(
// 		hostHtmlReadableStream: ReadableStream<Uint8Array>,
// 		fragmentResponse: Response,
// 		fragmentConfig: FragmentConfig,
// 		gateway: FragmentGateway,
// 	) {
// 		const rewrittenResponse = await rewriteHtmlResponse({
// 			hostInput: new Response(hostHtmlReadableStream),
// 			fragmentResponse,
// 			fragmentConfig,
// 			gateway,
// 		});
// 		return stream.Readable.fromWeb(rewrittenResponse.body as streamWeb.ReadableStream);
// 	}
// }

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

interface OriginResponse {
	// readyToSendHead is a back channel so that we know when to actually send headers, see writeHead patch below
	head: Promise<ResponseInit> & { readyToSendHead?: true };
	body: ReadableStream<Uint8Array>;
}

function interceptNodeResponse(
	response: http.ServerResponse,
	next: () => void,
): { originResponse: OriginResponse; serverResponse: http.ServerResponse } {
	let streamController: ReadableStreamDefaultController<any>;
	const readableStream = new ReadableStream<Uint8Array>({
		start(controller) {
			streamController = controller;
		},
	});

	// patch response
	const orig = {
		flushHeaders: response.flushHeaders.bind(response),
		write: response.write, //.bind(response),
		writeHead: response.writeHead.bind(response),
		writeHeadUnbound: response.writeHead,
		end: response.end.bind(response),
	};

	let originHead: ResponseInit;

	let { promise: originHeadPromise, resolve: originHeadResolve } = Promise.withResolvers<ResponseInit>();
	function retrieveOrigHead(
		statusCode: number,
		statusMessage?: string,
		headers?: http.OutgoingHttpHeaders | http.OutgoingHttpHeader[],
	) {
		console.log('retrieveOrigHead', statusCode, statusMessage, headers);
		if (originHead) {
			console.log('warning: Response head has already been flushed!');
			return;
		}

		originHead = {
			status: statusCode ?? response.statusCode,
			statusText: statusMessage ?? response.statusMessage,
			// TODO: correctly merge array cookies and flatten them into an object
			headers: { ...(response.getHeaders() as Record<string, string>), ...(headers as Record<string, string>) },
		};

		originHeadResolve(originHead);
	}

	response.flushHeaders = function interceptingFlushHeaders() {
		console.log('flushHeaders');
		// TODO: is it ok to completely ignore?
		// should we just resolve the originHeadPromise here?
		return response;
	};

	response.writeHead = function interceptingWriteHead(statusCode: number): http.ServerResponse {
		// @ts-ignore readyToSendHead is a back channel
		if (originHeadPromise?.readyToSendHead) {
			console.log('writeHead (intercepted with readyToSendHead signal)', ...arguments);
			return orig.writeHead.apply(this, arguments);
		}
		const statusMessage: string = arguments[1] instanceof String ? (arguments[1] as string) : '';
		const headers: http.OutgoingHttpHeaders =
			arguments[1] instanceof Object ? (arguments[1] as http.OutgoingHttpHeaders) : arguments[2];

		console.log('writeHead (intercepted)', statusCode, statusMessage, headers);
		retrieveOrigHead(statusCode, statusMessage, headers);

		// restore writeHead
		// TODO: we might be restoring too early here, but it's unclear if there is a better way to do it
		//response.writeHead = orig.writeHeadUnbound;
		return response;
	}; //satisfies typeof http.ServerResponse.prototype.writeHead;

	response.write = function interceptingWrite(chunk: any) {
		console.log('write (intercepted)', chunk);
		const encoding =
			chunk instanceof String
				? arguments[1] instanceof String
					? (arguments[1] as BufferEncoding)
					: 'utf8'
				: undefined;
		const callback = arguments[1] instanceof Function ? arguments[1] : arguments[2];

		const buffer = Buffer.from(chunk, encoding);
		streamController.enqueue(buffer);
		if (callback) callback(null);
		return true;
	};

	response.end = function interceptingEnd() {
		console.log('end (intercepted)', arguments);
		const chunk = arguments[0] instanceof Function ? null : arguments[0];
		const encoding =
			chunk instanceof String
				? arguments[1] instanceof String
					? (arguments[1] as BufferEncoding)
					: 'utf8'
				: undefined;
		const callback =
			arguments[0] instanceof Function ? arguments[0] : arguments[1] instanceof Function ? arguments[1] : arguments[2];

		if (chunk) {
			const buffer = Buffer.from(chunk, encoding);
			streamController.enqueue(buffer);
		}
		streamController.close();
		if (callback) callback(null);
		return response;
	};

	// call the next node middleware
	next();

	// create a new ServerResponse object that has it's prototype set to the original response
	// this allows us to inherit everything from the original response while still restoring
	// the patched methods in a way that will keep the methods patched for anyone who doesn't
	// have a reference to this new response object.
	const restoredResponse = Object.create(response);
	//restoredResponse.flushHeaders = orig.flushHeaders;
	//restoredResponse.writeHead = orig.writeHead;
	restoredResponse.write = orig.write;
	restoredResponse.end = orig.end;

	return {
		originResponse: { head: originHeadPromise, body: readableStream, readyToSendHead: false },
		serverResponse: restoredResponse,
	};
}

export const getNodeCompatMiddleware = getNodeMiddleware;
export function getNodeMiddleware(gateway: FragmentGateway, options: FragmentMiddlewareOptions = {}) {
	console.log('[Debug Info]: Node Compat middleware');
	const { additionalHeaders = {}, mode = 'development' } = options;

	const webMiddleware = getWebMiddleware(gateway, options);

	return async (nodeRequest: http.IncomingMessage, nodeResponse: http.ServerResponse, nodeNext: () => void) => {
		// const originalReqUrl = nodeRequestToUrl(req);
		// const matchedFragment = gateway.matchRequestToFragment(originalReqUrl.pathname);
		if (!(nodeRequest.url && gateway.matchRequestToFragment(nodeRequest.url))) {
			console.log('[Debug Info]: No fragment match, calling next()');
			return nodeNext();
		}

		const webRequest = nodeRequestToWebRequest(nodeRequest);
		const { originResponsePromise, sendResponse } = nodeToWebResponse(nodeResponse, nodeNext);
		const webNext = function webNodeCompatNext() {
			return originResponsePromise;
		};

		const processedWebResponse = await webMiddleware(webRequest, webNext);
		sendResponse(processedWebResponse);
	};
}

function nodeToWebResponse(
	nodeResponse: http.ServerResponse,
	nodeNext: () => void,
): {
	originResponsePromise: Promise<Response>;
	sendResponse: (response: Response) => void;
} {
	const { originResponse, serverResponse: outboundServerResponse } = interceptNodeResponse(nodeResponse, nodeNext);

	let originResponsePromise = originResponse.head.then((head) => new Response(originResponse.body, head));

	//const [headerFlushingStream, originReadableStream2] = originResponse.body.tee();
	//
	//let originResponsePromise = new Promise<Response>((resolve) => {
	// headerFlushingStream.pipeThrough(
	// 	new TransformStream({
	// 		start(controller) {
	// 			console.log('Starting stream processing...');
	// 			const contentType = nodeResponse.getHeader('content-type') as string;
	// 			const responseInit = {
	// 				headers: contentType ? { 'content-type': contentType } : undefined,
	// 				status: nodeResponse.statusCode,
	// 				statusText: nodeResponse.statusMessage,
	// 			};
	// 			const response = new Response(originReadableStream2, responseInit);
	// 			resolve(response);
	// 			controller.terminate();
	// 		},
	// 	}),
	// );
	//});

	const sendResponse = (response: Response) => {
		console.log('sendResponse', response);
		// response.headers.forEach((value, key) => {
		// 	nodeResponse.setHeader(key, value);
		// 	console.log('sending headers:', key, value);
		// });

		// nodeResponse.statusCode = response.status;
		// nodeResponse.statusMessage = response.statusText;

		console.log('asdfasdfasdf', nodeResponse.writeHead, outboundServerResponse.writeHead);
		const headersAsObject = Object.fromEntries(Array.from(response.headers.entries()));

		// back channel to signal that we are ready to send the http head via the outbound connection
		originResponse.head.readyToSendHead = true;
		outboundServerResponse.writeHead(response.status, response.statusText, headersAsObject);
		queueMicrotask(() => {
			console.log('piping body');

			stream.Readable.fromWeb(response.body as streamWeb.ReadableStream<any>)
				.pipe(outboundServerResponse)
				.on('error', (err) => {
					console.error('error piping body', err);
				})
				.on('close', () => {
					console.log('piping body close');
				});

			console.log('piping body end');
		});
	};

	return { originResponsePromise, sendResponse };
}
