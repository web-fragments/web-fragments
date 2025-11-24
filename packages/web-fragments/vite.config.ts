import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		minify: false,
		sourcemap: true,
		emptyOutDir: false,
		lib: {
			entry: {
				gateway: new URL('src/gateway/index.ts', import.meta.url).pathname,
				'gateway/node': new URL('src/gateway/middleware/node.ts', import.meta.url).pathname,
				'gateway/web': new URL('src/gateway/middleware/web.ts', import.meta.url).pathname,
				elements: new URL('src/elements/index.ts', import.meta.url).pathname,
			},
			formats: ['es'],
		},
		rollupOptions: {
			external: ['htmlrewriter', 'node:stream'],
			output: {
				assetFileNames: 'assets/[name][extname]',
				chunkFileNames: 'chunks/[name]-[hash].js',
				entryFileNames: '[name].js',
			},
		},
	},
});
