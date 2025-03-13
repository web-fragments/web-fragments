import { FragmentGateway, getWebMiddleware } from 'web-fragments/gateway';
import { PagesFunction } from '@cloudflare/workers-types';

// Initialize the FragmentGateway
const gateway = new FragmentGateway({
	prePiercingStyles: `<style id="fragment-piercing-styles" type="text/css">
    web-fragment-host[data-piercing="true"] {
      position: absolute;
      z-index: 9999999999999999999999999999999;
    }
  </style>`,
});

// Register fragments
gateway.registerFragment({
	fragmentId: 'remix',
	prePiercingClassNames: ['remix'],
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
	prePiercingClassNames: ['qwik'],
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
	fragmentId: 'party-button',
	prePiercingClassNames: [],
	routePatterns: ['/__wf/dev.web-fragments.demos.party-button/:_*'],
	endpoint: 'https://party-button.demos.web-fragments.dev/',
});

const middleware = getWebMiddleware(gateway, { mode: 'development' });

// CF Pages specific handler
export const onRequest: PagesFunction = async (context) => {
	const { request, next } = context;
	console.log('Incoming request', request.url);

	// run the standard middleware function
	return await middleware(request, next);
};
