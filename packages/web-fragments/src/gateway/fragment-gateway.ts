import { MatchFunction, match } from 'path-to-regexp';
import type { FragmentConfig, FragmentGatewayConfig } from './utils/types';

export class FragmentGateway {
	private fragmentConfigs: Map<string, FragmentConfig> = new Map();
	private routeMap: Map<MatchFunction, FragmentConfig> = new Map();
	#prePiercingStyles: string;

	constructor(config?: FragmentGatewayConfig) {
		this.#prePiercingStyles = config?.prePiercingStyles ?? '';
	}

	get prePiercingStyles() {
		return this.#prePiercingStyles;
	}

	/**
	 * Registers a fragment in the gateway worker so that it can be integrated
	 * with the gateway worker.
	 *
	 * @param fragmentConfig Configuration object for the fragment.
	 */
	registerFragment(fragmentConfig: FragmentConfig) {
		if (this.fragmentConfigs.has(fragmentConfig.fragmentId)) {
			console.warn(
				"\x1b[31m Warning: you're trying to register a fragment with id" +
					` "${fragmentConfig.fragmentId}", but a fragment with the same fragmentId` +
					` has already been registered, thus this` +
					' duplicate registration will be ignored. \x1b[0m',
			);
			return;
		}

		if (fragmentConfig.upstream && !fragmentConfig.endpoint) {
			throw new Error(
				"\x1b[31m You're using the deprecated `upstream` property" +
					` in the fragment config for fragment with id "${fragmentConfig.fragmentId}".` +
					' Please use `endpoint` config property instead. \x1b[0m',
			);
		}

		this.fragmentConfigs.set(fragmentConfig.fragmentId, fragmentConfig);

		// create a reverse mapping of route patterns to fragment configs
		// used for lookup when finding a route match.
		fragmentConfig.routePatterns.forEach((routePattern) => {
			const matcher = match(routePattern, {
				decode: globalThis.decodeURIComponent,
			});

			this.routeMap.set(matcher, fragmentConfig);
		});
	}

	matchRequestToFragment(urlOrRequest: string | URL | Request) {
		const path = new URL(urlOrRequest instanceof Request ? urlOrRequest.url : `${urlOrRequest}`).pathname;
		// TODO: path matching needs to take pattern specificity into account
		// such that more specific patterns are matched before less specific ones
		//   e.g. given route patterns `['/:accountId', '/:accountId/workers']` and a request path of `/abc123/workers/foo`,
		//   the matched pattern should be `/:accountId/workers` since it is the more specific pattern.
		const match = [...this.routeMap.keys()].find((matcher) => matcher(path));

		if (match) {
			return this.routeMap.get(match) ?? null;
		} else return null;
	}
}
