import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		lib: {
			entry: import.meta.resolve ? new URL(import.meta.resolve('./index.ts')).pathname : './index.ts',
			fileName: 'reframed',
			formats: ['es'],
		},
	},
});
