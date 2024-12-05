import { defineConfig } from 'vite';
import { glob } from 'glob';
import fs from 'node:fs/promises';
import http from 'node:http';

export default defineConfig({
	appType: 'mpa',
	resolve: {
		alias: {
			// cross-repo development only!
			// requires writable-dom checked out as a sibling to `reframed`
			//'writable-dom': new URL('../../../writable-dom/src/index.ts', import.meta.url).pathname,
			'web-fragments/elements': new URL('../src/elements/', import.meta.url).pathname,
		},
	},
	build: {
		outDir: 'dist',
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
			configureServer: (server) => {
				server.middlewares.use(fragmentGatewayMiddleware);
			},
			configurePreviewServer: (server) => {
				server.middlewares.use(fragmentGatewayMiddleware);
			},
		},
	],
});

async function fragmentGatewayMiddleware(req: http.IncomingMessage, res: http.ServerResponse, next: Function) {
	// if the server is receiving a request from an iframe, then it's because a iframe used for reframing is initializing
	// feed it with an empty document so that location.href is set correctly, but no other scripts load in this iframe
	if (req.headers['sec-fetch-dest'] === 'iframe') {
		res.setHeader('Vary', 'Sec-Fetch-Dest');
		res.setHeader('Content-Type', 'text/html');
		res.end('<!doctype html><title>');
		return;
	}

	if (req.headers['sec-fetch-dest'] === 'document') {
		if (req.url === '/location-and-history/') {
			res.setHeader('Vary', 'Sec-Fetch-Dest');
		}
		next();
		return;
	}

	// rewrite
	if (req.headers['sec-fetch-dest'] === 'empty') {
		if (req.url?.startsWith('/location-and-history/')) {
			res.setHeader('Vary', 'Sec-Fetch-Dest');
			res.setHeader('Content-Type', 'text/html');
			res.end(await fs.readFile(new URL('./location-and-history/routable.html', import.meta.url)));
			return;
		}
	}

	next();
}
