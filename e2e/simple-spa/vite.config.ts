import { defineConfig } from 'vite';

export default defineConfig({
	appType: 'mpa', // so that Vite returns 404 on fetch to an non-existent .html file
	resolve: {
		alias: {
			// cross-repo development only!
			// requires writable-dom checked out as a sibling to `reframed`
			'writable-dom': new URL('../../../writable-dom/src/index.ts', import.meta.url).pathname,
		},
	},
});
