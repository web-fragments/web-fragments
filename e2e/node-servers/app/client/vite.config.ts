import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	root: './src',
	build: {
		outDir: '../../../dist',
		minify: false,
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, 'src/index.html'),
				qwikPage: path.resolve(__dirname, 'src/qwik-page.html'),
				remixPage: path.resolve(__dirname, 'src/remix-page.html'),
			},
		},
	},
	resolve: {
		alias: {
			'web-fragments/elements': path.resolve(__dirname, '../../node_modules/web-fragments/dist/elements.js'),
		},
	},
});
