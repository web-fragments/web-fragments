import { FragmentGateway } from 'web-fragments/gateway';
import { getMiddleware } from 'web-fragments/gateway/middlewares/cloudflare-pages';

const getGatewayMiddleware: ((devMode: boolean) => PagesFunction) & {
	_gatewayMiddleware?: PagesFunction;
} = (devMode) => {
	if (getGatewayMiddleware._gatewayMiddleware) {
		return getGatewayMiddleware._gatewayMiddleware;
	}

	const gateway = new FragmentGateway({
		prePiercingStyles: `<style id="fragment-piercing-styles" type="text/css">
      fragment-host[data-piercing="true"] {
        position: absolute;
        z-index: 9999999999999999999999999999999;
    
        &.remix {
            bottom: 16%;
            left: 15%;
        }
      }
    </style>`,
	});

	gateway.registerFragment({
		fragmentId: 'remix',
		prePiercingClassNames: ['remix'],
		routePatterns: ['/remix-page/:_*', '/_fragment/remix/:_*'],
		// Note: the pierced-react-remix-fragment has to be available on port 3000
		endpoint: 'http://localhost:3000',
		onSsrFetchError: () => {
			return {
				response: new Response(
					"<p id='remix-fragment-not-found'><style>#remix-fragment-not-found { color: red; font-size: 2rem; }</style>Remix fragment not found</p>",
					{ headers: [['content-type', 'text/html']] },
				),
			};
		},
	});

	// Only used to demonstrate the ability to trigger error event while fetching the fragment
	gateway.registerFragment({
		fragmentId: 'remix-error',
		prePiercingClassNames: ['remix'],
		routePatterns: ['/remix-error-page/:_*', '/_fragment/remix-error/:_*'],
		// Note: This fragment doesn't exist, and will throw a network error while fetching
		endpoint: 'http://localhost:3001',
		onSsrFetchError: () => {
			return {
				response: new Response(
					"<p id='remix-fragment-not-found'><style>#remix-fragment-not-found { color: red; font-size: 2rem; }</style>Remix fragment not found</p>",
					{ headers: [['content-type', 'text/html']] },
				),
			};
		},
	});

	gateway.registerFragment({
		fragmentId: 'qwik',
		prePiercingClassNames: ['qwik'],
		routePatterns: ['/qwik-page/:_*', '/_fragment/qwik/:_*'],
		// Note: the pierced-react-qwik-fragment has to be available on port 8123
		endpoint: 'http://localhost:8123',
		forwardFragmentHeaders: ['x-fragment-name'],
		onSsrFetchError: () => {
			return {
				response: new Response(
					"<p id='qwik-fragment-not-found'><style>#qwik-fragment-not-found { color: red; font-size: 2rem; }</style>Qwik fragment not found</p>",
					{ headers: [['content-type', 'text/html']] },
				),
			};
		},
	});

	getGatewayMiddleware._gatewayMiddleware = getMiddleware(gateway, devMode ? 'development' : 'production');
	return getGatewayMiddleware._gatewayMiddleware;
};

export const onRequest: PagesFunction<{ DEV_MODE?: boolean }> = async (context) => {
	const gatewayMiddleware = getGatewayMiddleware(!!context.env.DEV_MODE);
	return gatewayMiddleware(context);
};
