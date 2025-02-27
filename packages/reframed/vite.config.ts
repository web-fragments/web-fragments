import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		lib: {
			entry: new URL('./index.ts', import.meta.url).pathname,
			fileName: 'reframed',
			formats: ['es'],
		},
	},
});
