import type { ServerBuild } from 'react-router';

declare module './build/server/index.js' {
	const build: ServerBuild;
	export default build;
}
