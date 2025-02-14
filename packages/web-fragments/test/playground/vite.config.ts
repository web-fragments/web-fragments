import { defineConfig, ViteDevServer, PreviewServer } from 'vite';
import { glob } from 'glob';
import http from 'node:http';
import path from 'node:path';
import { FragmentGateway } from '../../src/gateway';
import { getNodeMiddleware } from '../../src/gateway/middleware/node';

export default defineConfig({
	appType: 'mpa',
	resolve: {
		alias: {
			'web-fragments': new URL('../../src/elements/', import.meta.url).pathname,
		},
	},
	build: {
		outDir: 'node_modules/.playground/dist',
		emptyOutDir: true,
		rollupOptions: {
			input:
				// create an input map for rollup from all html files in the current directory
				(await glob('**/*.html', { ignore: 'dist/**' })).reduce<Record<string, string>>((config, path) => {
					// the key will become a filename for the js bundle, so escape all / to _
					const scriptName = path.replaceAll('/', '_');
					config[scriptName] = path;
					return config;
				}, {}),
		},
	},

	plugins: [
		{
			name: 'web-fragments-middleware',
			configureServer: configureGatewayMiddleware,
			configurePreviewServer: configureGatewayMiddleware,
		},
	],
});

async function configureGatewayMiddleware(server: ViteDevServer | PreviewServer) {
	let serverUrl: string;

	// Vite doesn't make it easy to get the server URL.
	// We first need to wait for the server to start, and only then we can compose the URL from the server address.
	server.httpServer!.once('listening', () => {
		const addressInfo = server.httpServer!.address()!;

		if (typeof addressInfo === 'string') {
			serverUrl = addressInfo;
			return;
		}

		const protocol = server.config.server.https ? 'https' : 'http';
		const host =
			addressInfo.address === '::' || addressInfo.address === '::1' || addressInfo.address === '0.0.0.0'
				? 'localhost'
				: addressInfo.address;
		const port = addressInfo.port;

		serverUrl = `${protocol}://${host}:${port}`;
	});

	// This URL will be the url of the fragment endpoint, which is the same as the url of the vite server.
	// Since we don't yet know what port we'll start on, this getter enables the fragment gateway to get it later.
	const getServerUrl = () => {
		if (!serverUrl) {
			throw new Error('Vite Server URL not yet available');
		}

		return serverUrl;
	};

	// Construct the middleware and configure it with Vite.
	const fragmentGatewayMiddleware = await getFragmentGatewayMiddleware(getServerUrl);
	server.middlewares.use(fragmentGatewayMiddleware);
}

async function getFragmentGatewayMiddleware(getServerUrl: () => string) {
	const fragmentGateway = new FragmentGateway();
	(await glob('**/', { ignore: ['dist/**', 'public/**', 'node_modules/**'] })).forEach((appDir) => {
		if (appDir === '.') return;

		const fragmentId = path.basename(appDir);

		console.log(`Registering fragment: ${fragmentId}`);
		fragmentGateway.registerFragment({
			fragmentId: fragmentId,
			piercing: false,
			routePatterns: [`/${fragmentId}/:_*`],
			get endpoint() {
				return getServerUrl();
			},
			prePiercingClassNames: [],
		});
	});

	const fragmentGatewayMiddleware = getNodeMiddleware(fragmentGateway);

	/**
	 * Middleware to handle requests for fragments in Vite.
	 */
	return function fragmentViteMiddleware(req: http.IncomingMessage, res: http.ServerResponse, next: () => void) {
		// TODO: Disable compression for now as the web-to-node adapter seems to have an issue with it.
		// Otherwise http request hang and no responses are ever sent in spite of the adapter flushing them to Node.
		delete req.headers['accept-encoding'];

		// If the request is from the gateway middleware then bypass the gateway middleware and serve the request from Vite directly.
		// There isn't conclusive way to identify requests from the gateway, but this combo should do for now.

		if (req.headers['x-fragment-mode'] && req.headers['x-forwarded-host']) {
			if (req.url?.endsWith('/')) {
				req.url = req.url + 'fragment.html';
			}
			return next();
		}

		// If the request is coming straight from the browser, then service it via the gateway.
		return fragmentGatewayMiddleware(req, res, next);
	};
}
