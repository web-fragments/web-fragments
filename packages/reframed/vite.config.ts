import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: resolve(import.meta.dirname, "index.ts"),
			fileName: "reframed",
			formats: ["es"],
		},
	},
});
