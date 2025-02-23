import stream from 'node:stream';
import streamWeb from 'node:stream/web';
import http from 'node:http';

/**
 * Converts a web-style middleware to a node-style middleware.
 *
 * This function enables web-style middlewares to be used in Node.js HTTP servers like express, connect, etc.
 *
 * The implementation is lazy and stream-based to avoid unnecessary buffering of request/response bodies.
 *
 * See https://www.tldraw.com/f/-759LrWk9uMRXIQYg9Nth?d=v-539.-420.4188.2805.page for a visual representation of the data flow.
 *
 * @param webMiddleware The middleware to adopt.
 * @returns The resulting node-style middleware.
 */
export function nodeToWebMiddleware(webMiddleware: (req: Request, next: () => Promise<Response>) => Promise<Response>) {
	return async function nodeMiddleware(
		nodeRequest: http.IncomingMessage,
		nodeResponse: http.ServerResponse,
		nodeNext: () => void,
	) {
		const webRequest = nodeRequestToWebRequest(nodeRequest);

		const { promise: callNodeNextPromise, resolve: callNodeNextResolve } = Promise.withResolvers<void>();
		const { originResponsePromise, sendResponse } = nodeToWebResponse(nodeResponse, nodeNext, callNodeNextPromise);
		const webNext = function webNodeCompatNext() {
			// send a signal that we want the nodeNext fn to be called
			callNodeNextResolve();
			return originResponsePromise;
		};

		const processedWebResponse = await webMiddleware(webRequest, webNext);
		sendResponse(processedWebResponse);
	};
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

export function nodeRequestToUrl(nodeReq: http.IncomingMessage): URL {
	return new URL(`${isHttps(nodeReq) ? 'https' : 'http'}://${nodeReq.headers.host || 'localhost'}${nodeReq.url}`);
}

interface OriginResponse {
	head: Promise<ResponseInit>;
	body: ReadableStream<Uint8Array>;
}

function interceptNodeResponse(
	response: http.ServerResponse,
	next: () => void,
	callNodeNextPromise: Promise<void>,
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
		write: response.write.bind(response),
		writeHead: response.writeHead.bind(response),
		writeHeadUnbound: response.writeHead,
		end: response.end.bind(response),
		destroy: response.destroy.bind(response),
	};

	let originHead: ResponseInit;

	let { promise: originHeadPromise, resolve: originHeadResolve } = Promise.withResolvers<ResponseInit>();
	function retrieveOrigHead(
		statusCode?: number,
		statusMessage?: string,
		headers?: http.OutgoingHttpHeaders | http.OutgoingHttpHeader[],
	) {
		if (originHead) {
			console.log('warning: Response head has already been flushed!');
			return;
		}

		originHead = {
			status: statusCode ?? response.statusCode,
			statusText: statusMessage ?? response.statusMessage,
			headers: { ...(response.getHeaders() as Record<string, string>), ...(headers as Record<string, string>) },
		};

		// Remove any already set headers, we'll write all headers when actually sending the response.
		// This allows the middleware to remove headers that were set by the node code.
		Object.keys(originHead.headers!).forEach((name) => {
			response.removeHeader(name);
		});

		originHeadResolve(originHead);
	}

	response.flushHeaders = function interceptingFlushHeaders() {
		retrieveOrigHead();
	} satisfies typeof http.ServerResponse.prototype.flushHeaders;

	response.writeHead = function interceptingWriteHead(statusCode: number): http.ServerResponse {
		const statusMessage: string = arguments[1] instanceof String ? (arguments[1] as string) : '';
		const headers: http.OutgoingHttpHeaders =
			arguments[1] instanceof Object ? (arguments[1] as http.OutgoingHttpHeaders) : arguments[2];

		retrieveOrigHead(statusCode, statusMessage, headers);

		return response;
	} satisfies typeof http.ServerResponse.prototype.writeHead;

	response.write = function interceptingWrite(chunk: any) {
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
	} satisfies typeof http.ServerResponse.prototype.write;

	response.end = function interceptingEnd() {
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
	} satisfies typeof http.ServerResponse.prototype.end;

	response.destroy = function interceptingDestroy(error?: Error) {
		streamController.error(error);
		return response;
	} satisfies typeof http.ServerResponse.prototype.destroy;

	// call the next node middleware if we receive a signal to do so
	callNodeNextPromise.then(() => {
		next();
	});

	// create a new ServerResponse object that has it's prototype set to the original response
	// this allows us to inherit everything from the original response while still restoring
	// the patched methods in a way that will keep the methods patched for anyone who doesn't
	// have a reference to this new response object.
	const restoredResponse = Object.create(response);

	restoredResponse.flushHeaders = orig.flushHeaders;
	restoredResponse.writeHead = orig.writeHead;
	restoredResponse.write = orig.write;
	restoredResponse.end = orig.end;
	restoredResponse.destroy = orig.destroy;

	return {
		originResponse: { head: originHeadPromise, body: readableStream },
		serverResponse: restoredResponse,
	};
}

function nodeToWebResponse(
	nodeResponse: http.ServerResponse,
	nodeNext: () => void,
	callNodeNextPromise: Promise<void>,
): {
	originResponsePromise: Promise<Response>;
	sendResponse: (response: Response) => void;
} {
	const { originResponse, serverResponse: outboundServerResponse } = interceptNodeResponse(
		nodeResponse,
		nodeNext,
		callNodeNextPromise,
	);

	let originResponsePromise = originResponse.head.then((head) => new Response(originResponse.body, head));

	const sendResponse = async (response: Response) => {
		console.log('sendResponse', response);
		response.headers.forEach((value, name) => {
			nodeResponse.appendHeader(name, value);
		});
		outboundServerResponse.writeHead(response.status, response.statusText);

		if (response.body) {
			stream.Readable.fromWeb(response.body as streamWeb.ReadableStream<any>).pipe(outboundServerResponse);
		} else {
			outboundServerResponse.end();
		}
	};

	return { originResponsePromise, sendResponse };
}

/**
 * Determines if a request is HTTPS.
 * @param {IncomingMessage | Request} req - The request object.
 * @returns {boolean} - Whether the request is HTTPS.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto
 */
export const isHttps = (req: http.IncomingMessage): boolean => {
	return req.headers['x-forwarded-proto'] === 'https' || (req.socket as any)?.encrypted === true;
};
