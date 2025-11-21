import { ChildProcess, spawn, spawnSync } from 'node:child_process';
import { Plugin, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const shouldSpawnFragments =
	process.env.npm_lifecycle_event === 'dev' ||
	(process.env.NODE_ENV === 'development' && process.env.npm_lifecycle_event !== 'build');

if (shouldSpawnFragments) {
	buildAndServeFragment('qwik');
	buildAndServeFragment('remix');

	// let's sleep for a bit in an effort to make the vite output the last one
	spawnSync('sleep', ['5']);
}

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		minify: false,
	},
	resolve: {
		alias: {
			'web-fragments': new URL('../../packages/web-fragments/src/elements/', import.meta.url).pathname,
		},
	},
	plugins: [react(), wranglerDevWithReload()],
});

function wranglerDevWithReload(): Plugin[] {
	if (process.env.NODE_ENV !== 'development') {
		return [];
	}

	const runWranglerDev: (() => void) & {
		workerDevProcess?: ChildProcess;
	} = () => {
		runWranglerDev.workerDevProcess?.kill();
		runWranglerDev.workerDevProcess = spawn('pnpm', ['wrangler', 'dev', '--local', '--var', 'DEV_MODE=true'], {
			stdio: 'inherit',
		});
	};

	return [
		{
			name: 'worker-external-hot-reload',
			buildStart() {
				// we want to watch for changes in the web-fragments/gateway entrypoint
				this.addWatchFile('../../packages/web-fragments/src/gateway');
				this.addWatchFile('src/worker.ts');
				// after each change lets re-run wrangler dev
				runWranglerDev();
			},
		},
	];
}

function buildAndServeFragment(fragment: 'remix' | 'qwik') {
	spawn('pnpm', ['--filter', `pierced-react___${fragment}-fragment`, 'buildAndServe'], {
		stdio: ['ignore', 'inherit', 'inherit'],
		env: { ...process.env, NODE_ENV: 'production' },
	});
}
