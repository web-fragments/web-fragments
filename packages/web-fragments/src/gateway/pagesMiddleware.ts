import type { FragmentGateway } from "./fragment-gateway";

const fragmentHostInitialization = ({
	content,
	classNames,
}: {
	content: string;
	classNames: string;
}) => `
<fragment-host class="${classNames}" data-piercing="true">
  <template shadowrootmode="open">${content}</template>
</fragment-host>`;

export function getPagesMiddleware(
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

		const response = await next();
		const isHTMLResponse = !!response.headers
			.get("content-type")
			?.startsWith("text/html");

		if (isHTMLResponse) {
			const matchedFragment = gateway.matchRequestToFragment(request);
			if (matchedFragment) {
				const requestUrl = new URL(request.url);

				const upstreamUrl = new URL(
					`${requestUrl.pathname}${requestUrl.search}`,
					matchedFragment.upstream
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

				const fragmentReq = new Request(upstreamUrl, {
					...request,
				});
				let fragmentRes: Response;
				let fragmentFailedResOrError: Response | unknown | null = null;
				try {
					const response = await fetch(fragmentReq);
					if (response.status >= 400 && response.status <= 599) {
						fragmentFailedResOrError = response;
					} else {
						fragmentRes = scriptRewriter.transform(response);
					}
				} catch (e) {
					fragmentFailedResOrError = e;
				}

				if (fragmentFailedResOrError) {
					if (matchedFragment.onSsrFetchError) {
						fragmentRes = await matchedFragment.onSsrFetchError(
							fragmentReq,
							fragmentFailedResOrError
						);
					} else {
						fragmentRes = new Response(
							mode === "development"
								? `<p>Fetching fragment upstream failed: ${matchedFragment.upstream}</p>`
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
									// TODO: what if don't get a body (i.e. can't fetch the fragment)? we should add some error handling here
									content: await fragmentRes.text(),
									classNames: matchedFragment.prePiercingClassNames.join(" "),
								}),
								{ html: true }
							);
						},
					});

				return rewriter.transform(response);
			}
		}

		return response;
	};
}
