import { FragmentGateway, getWebMiddleware } from 'web-fragments/gateway';
import { PagesFunction } from '@cloudflare/workers-types';

// Initialize the FragmentGateway
const gateway = new FragmentGateway({
	piercingStyles: `<style id="fragment-piercing-styles" type="text/css">
    web-fragment-host[data-piercing="true"] {
      position: absolute;
      z-index: 9999999999999999999999999999999;
    }
  </style>`,
});

// Register fragments
gateway.registerFragment({
	fragmentId: 'remix',
	piercingClassNames: ['remix'],
	routePatterns: ['/remix-page/:_*', '/_fragment/remix/:_*'],
	endpoint: 'http://localhost:3000',
	onSsrFetchError: () => ({
		response: new Response('<p>Remix fragment failed to load</p>', {
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
		response: new Response('<p>Qwik fragment failed to load</p>', {
			headers: { 'content-type': 'text/html' },
		}),
	}),
});

gateway.registerFragment({
	fragmentId: 'react-router',
	piercingClassNames: ['react-router'],
	routePatterns: ['/react-router/:_*', '/_fragment/react-router/:_*', '/__manifest?p=/react-router/:_*'],
	endpoint: 'http://localhost:3000',
	forwardFragmentHeaders: ['x-fragment-name'],
	onSsrFetchError: () => ({
		response: new Response('<p>React Router fragment failed to load</p>', {
			headers: { 'content-type': 'text/html' },
		}),
	}),
});

const middleware = getWebMiddleware(gateway, { mode: 'development' });

// CF Pages specific handler
export const onRequest: PagesFunction = async (context) => {
	const { request, next } = context;
	console.log('Incoming request', request.url);

	// run the standard middleware function
	return await middleware(request, next);
};
