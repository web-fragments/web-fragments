import type { ServerBuild } from '@remix-run/cloudflare';

declare module './build/server/index.js' {
	const build: ServerBuild;
	export default build;
}
