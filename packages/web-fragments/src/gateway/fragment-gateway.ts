import { MatchFunction, match } from 'path-to-regexp';

export class FragmentGateway {
	private fragmentConfigs: Map<string, FragmentConfig> = new Map();
	private routeMap: Map<(url: string) => boolean, FragmentConfig> = new Map();
	#piercingStyles?: string;

	constructor(config?: FragmentGatewayConfig) {
		if (config?.prePiercingStyles) {
			this.#piercingStyles = config.prePiercingStyles;
			console.warn(
				"\x1b[31m You're using the deprecated `prePiercingStyles` property" +
					` in the fragment gateway config. Please use \`piercingStyles\` instead. \x1b[0m`,
			);
		} else {
			this.#piercingStyles = config?.piercingStyles ?? '';
		}
	}

	get piercingStyles() {
		return this.#piercingStyles;
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

		// default to true
		fragmentConfig.piercing ??= true;

		this.fragmentConfigs.set(fragmentConfig.fragmentId, fragmentConfig);

		// create a reverse mapping of route patterns to fragment configs
		// used for lookup when finding a route match.
		fragmentConfig.routePatterns.forEach((routePattern) => {
			const [pathnamePattern, searchPattern = ''] = routePattern.split('?');

			const pathMatcher = match(pathnamePattern, {
				decode: globalThis.decodeURIComponent,
			});

			const searchMatcher = (search: string) => {
				// If there is no search param pattern rule in the route pattern, match the request
				if (!searchPattern) return true;

				// Compare the request search params with the search params in th route pattern
				const searchParamsPattern = new URLSearchParams(searchPattern);
				const searchParams = new URLSearchParams(search);

				// For every search params pattern specified in the route config,
				// Check against the decoded search param from the request.
				// Only match the request if all search params match the pattern.
				for (const [searchKey, searchValue] of searchParamsPattern) {
					const matcher = match(searchValue, {
						decode: globalThis.decodeURIComponent,
					});

					if (!matcher(searchParams.get(searchKey) || '')) return false;
				}

				return true;
			};

			const matcher = (urlPath: string) => {
				const [pathname, search = ''] = urlPath.split('?');
				return pathMatcher(pathname) && searchMatcher(search);
			};

			this.routeMap.set(matcher, fragmentConfig);
		});
	}

	matchRequestToFragment(urlPath: string) {
		// TODO: path matching needs to take pattern specificity into account
		// such that more specific patterns are matched before less specific ones
		//   e.g. given route patterns `['/:accountId', '/:accountId/workers']` and a request path of `/abc123/workers/foo`,
		//   the matched pattern should be `/:accountId/workers` since it is the more specific pattern.
		const match = [...this.routeMap.keys()].find((matcher) => matcher(urlPath));

		if (match) {
			return this.routeMap.get(match) ?? null;
		} else return null;
	}
}

/**
 * Configuration object for the registration of a fragment in the app's gateway worker.
 */
export interface FragmentConfig {
	/**
	 * Unique Id for the fragment.
	 */
	fragmentId: string;

	/**
	 * Whether the fragment should be pierced into the app shell on the server-side by the fragment gateway.
	 *
	 * Defaults to true.
	 */
	piercing?: boolean;

	/**
	 * Styles to apply to the fragment before it gets pierced, their purpose
	 * is to style the fragment in such a way to make it look as close as possible
	 * to the final pierced view (so that the piercing operation can look seamless).
	 *
	 * For best results they should use the following selector:
	 * :not(web-fragment) > web-fragment-host[fragment-id="fragmentId"]
	 */
	piercingClassNames?: string[];
	/**
	 * @deprecated use `piercingClassNames` instead
	 *
	 */
	prePiercingClassNames?: string[];
	/**
	 * An array of route patterns this fragment should handle serving.
	 * Pattern format must adhere to https://github.com/pillarjs/path-to-regexp#parameters syntax
	 */
	routePatterns: string[];
	/**
	 * The endpoint URI of the fragment application.
	 * This will be fetched on any request paths matching the specified `routePatterns`
	 */
	endpoint: string;
	/**
	 * @deprecated use `endpoint` instead
	 */
	upstream?: string;
	/**
	 * An optional list of fragment response headers to forward to the gateway response.
	 */
	forwardFragmentHeaders?: string[];
	/**
	 * Handler/Fallback to apply when the fetch for a fragment ssr code fails.
	 * It allows the gateway to serve the provided fallback response instead of an error response straight
	 * from the server.
	 *
	 * @param req the request sent to the fragment
	 * @param failedRes the failed response (with a 4xx or 5xx status) or the thrown error
	 * @returns the response to use for the document's ssr
	 */
	onSsrFetchError?: (
		req: Request,
		failedResOrError: Response | Error,
	) => SSRFetchErrorResponse | Promise<SSRFetchErrorResponse>;
}

export interface SSRFetchErrorResponse {
	response: Response;
	overrideResponse?: boolean;
}

export interface FragmentGatewayConfig {
	piercingStyles?: string;
	/**
	 * @deprecated use `piercingStyles` instead
	 */
	prePiercingStyles?: string;
}

export interface FragmentMiddlewareOptions {
	additionalHeaders?: HeadersInit;
	mode?: 'production' | 'development';
}
