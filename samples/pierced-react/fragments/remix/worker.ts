import { createRequestHandler } from '@remix-run/cloudflare';
import type { AppLoadContext, ServerBuild } from '@remix-run/cloudflare';

import * as remixBuild from './build/server/index.js';

interface Env {
	ASSETS?: Fetcher;
	DEV_MODE?: string;
}

const build = remixBuild as unknown as ServerBuild;

const remixHandler = createRequestHandler(build, build.mode);

let hasLoggedMissingAssetsBinding = false;

async function maybeServeStaticAsset(request: Request, env: Env) {
	if (!env.ASSETS) {
		if (!hasLoggedMissingAssetsBinding) {
			hasLoggedMissingAssetsBinding = true;
			console.error('Static asset binding "ASSETS" is missing for the Remix fragment.');
		}
		return null;
	}

	if (request.method !== 'GET' && request.method !== 'HEAD') {
		return null;
	}

	try {
		const assetResponse = await env.ASSETS.fetch(request);

		if (assetResponse.status === 404) {
			return null;
		}

		return assetResponse;
	} catch (error) {
		console.error('Failed to read Remix static asset from ASSETS binding.', error);
		return null;
	}
}

function createLoadContext(env: Env, ctx: ExecutionContext): AppLoadContext {
	return { env, ctx } as AppLoadContext;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const assetResponse = await maybeServeStaticAsset(request, env);

		if (assetResponse) {
			return assetResponse;
		}

		const response = await remixHandler(request, createLoadContext(env, ctx));

		if (env.DEV_MODE === 'true') {
			response.headers.set('CF-Cache-Status', 'DEV');
		}

		return response;
	},
};
