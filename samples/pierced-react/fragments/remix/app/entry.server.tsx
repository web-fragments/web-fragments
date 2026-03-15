/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import type { AppLoadContext, EntryContext } from '@remix-run/cloudflare';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';

const ABORT_DELAY = 5_000;

export default async function handleRequest(
	request: Request,
	status: number,
	headers: Headers,
	remixContext: EntryContext,
	// The load context is unused today but helps future middleware hook in.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	loadContext: AppLoadContext,
) {
	const body = await renderToReadableStream(
		<RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
		{
			signal: request.signal,
			onError: (error: unknown) => {
				status = 500;
				console.error(error);
			},
		},
	);

	if (isbot(request.headers.get('user-agent') || '')) {
		await body.allReady;
	}

	headers.set('Content-Type', 'text/html; charset=utf-8');

	return new Response(body, {
		headers,
		status,
	});
}
