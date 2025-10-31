import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		minify: false,
		sourcemap: true,
		emptyOutDir: false,
		lib: {
			entry: {
				index: new URL('src/index.ts', import.meta.url).pathname,
			},
			formats: ['es'],
		},
		rollupOptions: {
			external: [],
			output: {},
		},
	},
});
