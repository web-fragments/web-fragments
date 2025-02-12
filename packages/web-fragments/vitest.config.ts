import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		deps: {
			//			inline: ['node:fs', 'node:stream'],
		},
		setupFiles: ['./test/gateway/setup.ts'],
	},
});
