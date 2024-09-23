import { ChildProcess, spawn, spawnSync } from "node:child_process";
import { Plugin, defineConfig } from "vite";
import react from "@vitejs/plugin-react";

if (process.env.NODE_ENV === "development") {
	buildAndServeFragment("qwik");
	buildAndServeFragment("remix");

	// let's sleep for a bit in an effort to make the vite output the last one
	spawnSync("sleep", ["10"]);
}

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), ntlDevOnReload()],
});

function ntlDevOnReload(): Plugin[] {

	if (process.env.NODE_ENV !== "development") {
		return [];
	}

	const ntlDevProcess: (() => void) & {
		developmentProcess?: ChildProcess;
	} = () => {
		ntlDevProcess.developmentProcess?.kill();
		ntlDevProcess.developmentProcess = spawn(
			"pnpm",
			["netlify", "dev"],
			{ stdio: "inherit" }
		);
	};

	return [
		{
			name: "netlify-functions-external-hot-reload",
			buildStart() {
				// we want to watch for changes in the web-fragments/gateway entrypoint
				this.addWatchFile("../../packages/web-fragments/src/gateway");

				// after each change lets re-run ntl dev
				ntlDevProcess();
			},
		},
	];
}

function buildAndServeFragment(fragment: "remix" | "qwik") {
	spawn(
		"pnpm",
		["--filter", `pierced-react-netlify___${fragment}-fragment`, "buildAndServe"],
		{
			stdio: ["ignore", "inherit", "inherit"],
			env: { ...process.env, NODE_ENV: "production" },
		}
	);
}
