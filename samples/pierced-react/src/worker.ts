import { FragmentGateway, getWebMiddleware } from 'web-fragments/gateway';

interface Env {
	ASSETS?: {
		fetch: (request: Request) => Promise<Response>;
	};
	DEV_MODE?: string;
}

const gateway = new FragmentGateway({
	piercingStyles: `<style id="fragment-piercing-styles" type="text/css">
    web-fragment-host[data-piercing="true"] {
      position: absolute;
      z-index: 9999999999999999999999999999999;
    }
  </style>`,
});

gateway.registerFragment({
	fragmentId: 'remix',
	piercingClassNames: ['remix'],
	routePatterns: ['/remix-page/:_*', '/_fragment/remix/:_*'],
	endpoint: 'http://localhost:3000',
	onSsrFetchError: () => ({
		response: new Response('<p>Remix fragment not found</p>', {
			headers: { 'content-type': 'text/html' },
		}),
	}),
});

gateway.registerFragment({
	fragmentId: 'qwik',
	piercingClassNames: ['qwik'],
	routePatterns: ['/qwik-page/:_*', '/_fragment/qwik/:_*'],
	endpoint: 'http://localhost:8123',
	forwardFragmentHeaders: ['x-fragment-name'],
	onSsrFetchError: () => ({
		response: new Response('<p>Qwik fragment not found</p>', {
			headers: { 'content-type': 'text/html' },
		}),
	}),
});

gateway.registerFragment({
	fragmentId: 'react-router',
	piercingClassNames: ['react-router'],
	routePatterns: ['/rr-page/:_*', '/_fragment/react-router/:_*'],
	endpoint: 'http://localhost:3001',
	onSsrFetchError: () => ({
		response: new Response('<p>React Router fragment not found</p>', {
			headers: { 'content-type': 'text/html' },
		}),
	}),
});

const middlewareByMode = {
	development: getWebMiddleware(gateway, { mode: 'development' }),
	production: getWebMiddleware(gateway, { mode: 'production' }),
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const mode = env.DEV_MODE === 'true' ? 'development' : 'production';
		const middleware = middlewareByMode[mode];

		const next = () => {
			if (env.ASSETS?.fetch) {
				return env.ASSETS.fetch(request);
			}
			console.error('ASSETS binding missing; ensure wrangler.toml configures assets directory');
			return Promise.resolve(new Response('Static asset binding missing', { status: 500 }));
		};

		return middleware(request, next);
	},
};
