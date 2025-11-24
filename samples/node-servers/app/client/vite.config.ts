import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	root: './src',
	publicDir: path.resolve(__dirname, 'public'),
	build: {
		outDir: '../../../dist',
		minify: false,
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, 'src/index.html'),
				qwikPage: path.resolve(__dirname, 'src/qwik-page.html'),
				remixPage: path.resolve(__dirname, 'src/remix-page.html'),
				rrPage: path.resolve(__dirname, 'src/rr-page.html'),
			},
		},
	},
});
