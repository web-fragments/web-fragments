import type { FragmentGateway } from "../../fragment-gateway";

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

export function getMiddleware(
	gateway: FragmentGateway,
	mode: "production" | "development" = "development"
): PagesFunction<unknown> {
	return async ({ request, next }) => {
		/**
		 * This early return makes it so that all http requests
		 * from an iframe return an empty html response.
		 *
		 * This is done to enable setting iframe.src in reframed,
		 * so that window.location (which is unpatchable and can't
		 * be modified without triggering an undesirable iframe
		 * reload) in the reframed context has the correct url.
		 */
		if (request.headers.get("sec-fetch-dest") === "iframe") {
			const matchedFragment = gateway.matchRequestToFragment(request);
			if (matchedFragment) {
				return new Response("<!doctype html><title>");
			}
		}

		// If this is a document request, we should bail and
		// let the dash static asset handler return the dash document
		if (request.headers.get("sec-fetch-dest") !== "document") {
			// Otherwise, we should try to match the incoming request path against
			// any of the registered fragment route patterns, and if we get a match
			// return the fetch from the fragment's upstream.
			const matchedFragment = gateway.matchRequestToFragment(request);
			if (matchedFragment) {
				const requestUrl = new URL(request.url);
				const upstreamUrl = new URL(
					`${requestUrl.pathname}${requestUrl.search}`,
					matchedFragment.upstream
				);

				return fetch(upstreamUrl, request);
			}
		}

		const hostResponse = await next();
		const isHTMLResponse = !!hostResponse.headers
			.get("content-type")
			?.startsWith("text/html");

		if (isHTMLResponse) {
			const matchedFragment = gateway.matchRequestToFragment(request);
			if (matchedFragment) {
				const {
					fragmentId,
					upstream,
					forwardFragmentHeaders,
					prePiercingClassNames,
					onSsrFetchError,
				} = matchedFragment;
				const requestUrl = new URL(request.url);
				const upstreamUrl = new URL(
					`${requestUrl.pathname}${requestUrl.search}`,
					upstream
				);

				// TODO: this logic should not be here but in the reframed package (and imported and used here)
				//       since there's a coordination need between the gateway and what happens in the browser
				//       and if the code is split things can easily get out of sync
				const scriptRewriter = new HTMLRewriter().on("script", {
					element(element) {
						const scriptType = element.getAttribute("type");
						if (scriptType) {
							element.setAttribute("data-script-type", scriptType);
						}
						element.setAttribute("type", "inert");
					},
				});

				const fragmentReq = new Request(upstreamUrl, request);
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

				let embeddedFragmentResponse: Response = new Response();
				let fragmentFailedResOrError: Response | unknown | null = null;
				try {
					const fragmentResponse = await fetch(fragmentReq);
					if (
						fragmentResponse.status >= 400 &&
						fragmentResponse.status <= 599
					) {
						fragmentFailedResOrError = fragmentResponse;
					} else {
						embeddedFragmentResponse =
							scriptRewriter.transform(fragmentResponse);
					}
				} catch (e) {
					fragmentFailedResOrError = e;
				}

				/**
				 * If the fetch for the fragment fails, we need to be able to handle that response gracefully.
				 * Each fragment can define it's own error handling callback which returns a Response to be then embedded
				 * in the initial SSR response coming from the downstream route handler.
				 *
				 * For scenarios where you want to completely overwrite the response on error,
				 * return an object from the callback with property {overwriteResponse: true}
				 */
				if (fragmentFailedResOrError) {
					if (onSsrFetchError) {
						const { response, overrideResponse } = await onSsrFetchError(
							fragmentReq,
							fragmentFailedResOrError
						);

						if (overrideResponse) {
							return response;
						}

						embeddedFragmentResponse = response;
					} else {
						embeddedFragmentResponse = new Response(
							mode === "development"
								? `<p>Fetching fragment upstream failed: ${upstream}</p>`
								: "<p>There was a problem fulfilling your request.</p>",
							{ headers: [["content-type", "text/html"]] }
						);
					}
				}

				const rewriter = new HTMLRewriter()
					.on("head", {
						element(element) {
							element.append(gateway.prePiercingStyles, { html: true });
						},
					})
					.on("body", {
						async element(element) {
							// TODO: the HTMLRewriter API doesn't allow us to pass a stream, or maybe it does?
							//       we should look into this and support streams if possible
							element.append(
								fragmentHostInitialization({
									fragmentId,
									// TODO: what if don't get a body (i.e. can't fetch the fragment)? we should add some error handling here
									content: await embeddedFragmentResponse.text(),
									classNames: prePiercingClassNames.join(" "),
								}),
								{ html: true }
							);
						},
					});

				const gatewayResponse = rewriter.transform(hostResponse);

				if (forwardFragmentHeaders?.length) {
					forwardFragmentHeaders.forEach((header) => {
						gatewayResponse.headers.append(
							header,
							embeddedFragmentResponse.headers.get(header) || ""
						);
					});
				}

				return gatewayResponse;
			}
		}

		return hostResponse;
	};
}
