import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		deps: {},
		setupFiles: ['./test/gateway/setup.ts'],
	},
});
