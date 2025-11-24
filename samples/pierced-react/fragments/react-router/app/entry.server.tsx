import { isbot } from 'isbot';
import type { AppLoadContext, EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';
import server from 'react-dom/server';

const STREAM_TIMEOUT = 5_000;

const { renderToReadableStream } = server;

export default async function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	routerContext: EntryContext,
	_loadContext: AppLoadContext,
) {
	if (request.method.toUpperCase() === 'HEAD') {
		return new Response(null, {
			status: responseStatusCode,
			headers: responseHeaders,
		});
	}

	const userAgent = request.headers.get('user-agent') ?? '';
	const isBotRequest = userAgent ? isbot(userAgent) : false;
	let didError = false;

	const body = await renderToReadableStream(<ServerRouter context={routerContext} url={request.url} />, {
		signal: request.signal,
		onError(error) {
			didError = true;
			responseStatusCode = 500;
			if (process.env.NODE_ENV !== 'production') {
				console.error(error);
			}
		},
	});

	const abortDelay = setTimeout(() => {
		void body.cancel();
	}, STREAM_TIMEOUT);

	try {
		if (isBotRequest || routerContext.isSpaMode) {
			await body.allReady;
		} else {
			void body.allReady.catch(() => {});
		}
	} finally {
		clearTimeout(abortDelay);
	}

	responseHeaders.set('Content-Type', 'text/html');

	return new Response(body, {
		status: didError ? 500 : responseStatusCode,
		headers: responseHeaders,
	});
}
