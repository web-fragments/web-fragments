import type { FragmentConfig, FragmentGateway } from "../../fragment-gateway";

const fragmentHostInitialization = ({
	fragmentId,
	content,
	classNames,
}: {
	fragmentId: string;
	content: string;
	classNames: string;
}) => `
<fragment-host class="${classNames}" fragment-id="${fragmentId}" data-piercing="true">
  <template shadowrootmode="open">${content}</template>
</fragment-host>`;

export type FragmentMiddlewareOptions = {
	additionalHeaders?: HeadersInit;
	mode?: "production" | "development";
};

export function getMiddleware(
	gateway: FragmentGateway,
	options: FragmentMiddlewareOptions = {}
): PagesFunction<unknown> {
	const { additionalHeaders = {}, mode = "development" } = options;

	return async ({ request, next }) => {
		const matchedFragment = gateway.matchRequestToFragment(request);

		if (matchedFragment) {
			// If this request was initiated by an iframe (via reframed),
			// return a stub document.
			//
			// Reframed has to set the iframe's `src` to the fragment URL to have
			// its `document.location` reflect the correct value
			// (and also avoid same-origin policy restrictions).
			// However, we don't want the iframe's document to actually contain the
			// fragment's content; we're only using it as an isolated execution context.
			// Returning a stub document here is our workaround to that problem.
			if (request.headers.get("sec-fetch-dest") === "iframe") {
				return new Response("<!doctype html><title>");
			}

			const fragmentResponse = fetchFragment(request, matchedFragment);

			// If this is a document request, we need to fetch the host application
			// and if we get a successful HTML response, we need to embed the fragment inside it.
			if (request.headers.get("sec-fetch-dest") === "document") {
				const hostResponse = await next();
				const isHTMLResponse = !!hostResponse.headers
					.get("content-type")
					?.startsWith("text/html");

				if (hostResponse.ok && isHTMLResponse) {
					return fragmentResponse
						.then(rejectErrorResponses)
						.catch(handleFetchErrors(request, matchedFragment))
						.then(prepareFragmentForReframing)
						.then(embedFragmentIntoHost(hostResponse, matchedFragment))
						.then(attachForwardedHeaders(fragmentResponse, matchedFragment))
						.catch(renderErrorResponse);
				}
			}

			// Otherwise, just return the fragment response.
			return fragmentResponse;
		} else {
			return next();
		}
	};

	async function fetchFragment(
		request: Request,
		fragmentConfig: FragmentConfig
	) {
		const { upstream } = fragmentConfig;
		const requestUrl = new URL(request.url);
		const upstreamUrl = new URL(
			`${requestUrl.pathname}${requestUrl.search}`,
			upstream
		);

		const fragmentReq = new Request(upstreamUrl, request);

		// attach additionalHeaders to fragment request
		for (const [name, value] of new Headers(additionalHeaders).entries()) {
			fragmentReq.headers.set(name, value);
		}

		// Note: we don't want to forward the sec-fetch-dest since we usually need
		//       custom logic so that we avoid returning full htmls if the header is
		//       not set to 'document'
		fragmentReq.headers.set("sec-fetch-dest", "empty");

		// Add a header for signalling embedded mode
		fragmentReq.headers.set("x-fragment-mode", "embedded");

		if (mode === "development") {
			// brotli is not currently supported during local development (with `wrangler (pages) dev`)
			// so we set the accept-encoding to gzip to avoid problems with it
			fragmentReq.headers.set("Accept-Encoding", "gzip");
		}

		return fetch(fragmentReq);
	}

	function rejectErrorResponses(response: Response) {
		if (response.ok) return response;
		throw response;
	}

	function handleFetchErrors(
		fragmentRequest: Request,
		fragmentConfig: FragmentConfig
	) {
		return async (fragmentResponseOrError: unknown) => {
			const {
				upstream,
				onSsrFetchError = () => ({
					response: new Response(
						mode === "development"
							? `<p>Fetching fragment upstream failed: ${upstream}</p>`
							: "<p>There was a problem fulfilling your request.</p>",
						{ headers: [["content-type", "text/html"]] }
					),
					overrideResponse: false,
				}),
			} = fragmentConfig;

			const { response, overrideResponse } = await onSsrFetchError(
				fragmentRequest,
				fragmentResponseOrError
			);

			if (overrideResponse) throw response;
			return response;
		};
	}

	function renderErrorResponse(err: unknown) {
		if (err instanceof Response) return err;
		throw err;
	}

	// When embedding an SSRed fragment, we need to make
	// any included scripts inert so they only get executed by Reframed.
	function prepareFragmentForReframing(fragmentResponse: Response) {
		return new HTMLRewriter()
			.on("script", {
				element(element) {
					const scriptType = element.getAttribute("type");
					if (scriptType) {
						element.setAttribute("data-script-type", scriptType);
					}
					element.setAttribute("type", "inert");
				},
			})
			.transform(fragmentResponse);
	}

	function embedFragmentIntoHost(
		hostResponse: Response,
		fragmentConfig: FragmentConfig
	) {
		return (fragmentResponse: Response) => {
			const { fragmentId, prePiercingClassNames } = fragmentConfig;

			return new HTMLRewriter()
				.on("head", {
					element(element) {
						element.append(gateway.prePiercingStyles, { html: true });
					},
				})
				.on("body", {
					async element(element) {
						element.append(
							fragmentHostInitialization({
								fragmentId,
								content: await fragmentResponse.text(),
								classNames: prePiercingClassNames.join(" "),
							}),
							{ html: true }
						);
					},
				})
				.transform(hostResponse);
		};
	}

	function attachForwardedHeaders(
		fragmentResponse: Promise<Response>,
		fragmentConfig: FragmentConfig
	) {
		return async (response: Response) => {
			const fragmentHeaders = (await fragmentResponse).headers;
			const { forwardFragmentHeaders = [] } = fragmentConfig;

			for (const header of forwardFragmentHeaders) {
				response.headers.append(header, fragmentHeaders.get(header) || "");
			}

			return response;
		};
	}
}
