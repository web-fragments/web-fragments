import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		reporters: ['dot'],
		deps: {},
		setupFiles: [],
	},
});
