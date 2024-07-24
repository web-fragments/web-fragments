import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	build: {
		emptyOutDir: false,
		lib: {
			entry: {
				gateway: new URL("src/gateway/index.ts", import.meta.url).pathname,
				"gateway/middlewares/cloudflare-pages": new URL(
					"src/gateway/middlewares/cloudflare-pages/index.ts",
					import.meta.url
				).pathname,
				elements: new URL("src/elements/index.ts", import.meta.url).pathname,
			},
			formats: ["es"],
		},
		rollupOptions: {
			external: ["react", "react-dom", "reframed"],
			output: {
				globals: {
					react: "React",
					"react-dom": "ReactDOM",
				},
			},
		},
	},
	resolve: {
		alias: {
			// cross-repo development only!
			// requires writable-dom checked out as a sibling to `reframed`
			// TODO: this is incorrect here and should be addressed as fragment-elements should be able to be standalone
			"writable-dom": new URL(
				"../../../writable-dom/src/index.ts",
				import.meta.url
			).pathname,
		},
	},
});
