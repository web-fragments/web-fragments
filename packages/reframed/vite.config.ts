import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: new URL(import.meta.resolve("./index.ts")).pathname,
			fileName: "reframed",
			formats: ["es"],
		},
	},
});
