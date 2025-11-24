import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	mode: 'development',
	build: {
		minify: false,
		assetsDir: '_fragment/react-router/assets',
	},
	plugins: [reactRouter(), tsconfigPaths()],
});
