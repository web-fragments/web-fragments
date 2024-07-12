import { ChildProcess, spawn, spawnSync } from "node:child_process";
import { Plugin, defineConfig } from "vite";
import react from "@vitejs/plugin-react";

if (process.env.NODE_ENV === "development") {
	serveRemixFragment();
}

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), wranglerPagesDevWithReload()],
});

function wranglerPagesDevWithReload(): Plugin[] {
	if (process.env.NODE_ENV !== "development") {
		return [];
	}

	const runWranglerPagesDev: (() => void) & {
		pagesDevProcess?: ChildProcess;
	} = () => {
		runWranglerPagesDev.pagesDevProcess?.kill();
		runWranglerPagesDev.pagesDevProcess = spawn(
			"pnpm",
			["wrangler", "pages", "dev", "--binding", "DEV_MODE=true"],
			{ stdio: "inherit" }
		);
	};

	return [
		{
			name: "pages-functions-external-hot-reload",
			buildStart() {
				// we want to watch for changes in the web-fragments/gateway entrypoint
				this.addWatchFile("../../packages/web-fragments/src/gateway");
				// after each change lets re-run wrangler pages dev
				runWranglerPagesDev();
			},
		},
	];
}

function serveRemixFragment() {
	// build the remix fragment
	spawnSync("pnpm", ["--filter", "pierced-react-remix-fragment", "build"], {
		stdio: "inherit",
	});

	// serve the remix fragment (in production mode)
	spawn("pnpm", ["--filter", "pierced-react-remix-fragment", "start"], {
		stdio: "inherit",
		env: { ...process.env, NODE_ENV: "production" },
	});
}
