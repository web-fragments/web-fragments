import type { EventContext, ExecutionContext, Fetcher } from '@cloudflare/workers-types';
import { createRequestHandler } from '@react-router/cloudflare';
import type { ServerBuild } from 'react-router';

type Env = {
	ASSETS?: Fetcher;
	DEV_MODE?: string;
};

type CloudflareEvent = EventContext<Env, string, Record<string, unknown>>;

const handlerCache = new Map<string, ReturnType<typeof createRequestHandler>>();

function getRequestHandler(mode: string) {
	let handler = handlerCache.get(mode);
	if (!handler) {
		handler = createRequestHandler({
			// This file is emitted by `react-router build` during fragment compilation.
			build: () => import('./build/server/index.js') as Promise<ServerBuild>,
			mode,
		});
		handlerCache.set(mode, handler);
	}

	return handler;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const isDev = env.DEV_MODE === 'true';
		const mode = isDev ? 'development' : 'production';

		if (!isDev && env.ASSETS) {
			const assetRequest = request as unknown as Parameters<Fetcher['fetch']>[0];
			const assetResponse = await env.ASSETS.fetch(assetRequest);
			if (assetResponse.status !== 404) {
				return assetResponse;
			}
		}

		const requestHandler = getRequestHandler(mode);

		/**
		 * React Router expects the full Cloudflare `EventContext` shape. The fields below mirror
		 * the runtime values Pages would normally supply so our local worker behaves exactly like
		 * production. `next`, `params`, and `data` default to no-ops because the fragment never calls
		 * them today, but they remain available for future handlers.
		 */
		const assetsFetch = env.ASSETS
			? (input: Request | string, init?: RequestInit) =>
					(env.ASSETS as Fetcher).fetch(
						input as Parameters<Fetcher['fetch']>[0],
						init as Parameters<Fetcher['fetch']>[1],
					)
			: fetch;

		const cloudflareEvent = {
			// The Cloudflare runtime decorates `Request` with additional CF metadata, so we align the
			// value with that richer type before handing it to React Router's handler.
			request: request as unknown as CloudflareEvent['request'],
			functionPath: new URL(request.url).pathname,
			waitUntil: ctx.waitUntil.bind(ctx),
			passThroughOnException: ctx.passThroughOnException.bind(ctx),
			next: ((input?: Request | string, init?: RequestInit) =>
				fetch(
					(input ?? request) as unknown as globalThis.RequestInfo,
					init as unknown as globalThis.RequestInit,
				)) as unknown as CloudflareEvent['next'],
			env: {
				...env,
				ASSETS: {
					fetch: assetsFetch as unknown as typeof fetch,
				},
			} as unknown as CloudflareEvent['env'],
			params: {} as CloudflareEvent['params'],
			data: {} as CloudflareEvent['data'],
		} as unknown as CloudflareEvent;

		return (requestHandler as unknown as (event: CloudflareEvent) => Promise<Response>)(cloudflareEvent);
	},
};
