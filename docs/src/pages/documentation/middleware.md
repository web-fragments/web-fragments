---
title: "Web Fragments Middleware"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: December 8, 2024

## Web Fragments middleware

Middleware is typically a server-side executed script that processes requests and responses intercepted in the communication between server to client and client to server.

Middleware often introduces types and methods and other functionality, that connects the technology and infrastructure agnostic libraries, to required vendor code.

## Base middleware

The base middleware supports the Web standard API (Fetch API) scenario. The middleware uses the [fragment-gateway](./gateway.md) to match a request to a fragment and fetch the corresponding content and assets from the upstream endpoint.

It does so by identifying and classifying client-side requests using the `sec-fetch-dest` headers. This information is only important for debugging your application flow.


### Case 1: sec-fetch-dest identifies an iframe request

When a request's `sec-fetch-dest` equals iframe, the server must respond with an empty HTML template, and set the `Content-Type` header to `text-html`

```javascript
if (request.headers["sec-fetch-dest"] === "iframe") {
	response.setHeader("content-type", "text/html");
	return response.end("<!doctype html><title>");
}
```

### Case 2: sec-fetch-header identifies a document request

For documents, the middleware should defer the request to the server in place to serve the request as expected and, when applicable, embed the fragment in the `fragment` placeholder.

```javascript
if (request.headers["sec-fetch-dest"] === "document") {
	next();
}
```

### Case 3: sec-fetch-header identifies a script request

For scripts, the corresponding header should be set.

```javascript
if (request.headers["sec-fetch-dest"] === "script") {
	response.setHeader("content-type", "text/javascript");
}
```


## Existing middleware


As explained above, the base middleware support [Fetch API](https://developer.mozilla.org/docs/Web/API/Fetch_API/Using_Fetch) but we also provide an adapter for [Node.js](https://nodejs.org) native http requests and response and Connect framework.

To use the middleware in your server or functions, you will need to instantiate it and wrap it. For example, if you're using [Cloudflare Workers](https://workers.cloudflare.com/):

```javascript
import { FragmentGateway } from 'web-fragments/gateway';
import { getWebMiddleware } from 'web-fragments/gateway/web';
import { PagesFunction } from '@cloudflare/workers-types';

// Initialize the FragmentGateway
const gateway = new FragmentGateway({
	// code here
});

// Register fragments here ...

// Use base web middleware
const middleware = getWebMiddleware(gateway, { mode: MODE });

// CF Pages specific handler
export const onRequest: PagesFunction = async (context) => {
	const { request, next } = context;
	console.log('Incoming request', request.url);

	// run the standard middleware function
	const response = (await middleware(
		request as unknown as Request,
		next as unknown as () => Promise<Response>,
	)) as Response;
	return response as unknown as import('@cloudflare/workers-types').Response;
};
```

## Node native http request/responses and Express wrapper

If you're running your shell in an Express server, your wrapper will look like this

```javascript
// add code here
```

---


### Fetching a fragment

Once the requests are identified, and when there is a fragment match, the middlware uses the [gateway](./gateway) to fetch the corresponding fragment and the [reframing](./reframed) mechanism kicks in.

![web fragments middleware](../../assets/images/wf-middleware.drawio.png)

## Processing responses

To understand the `web-fragment` lifecycle, please read the [fragment host lifecycle](./elements#fragment-host-client-side) documentation.

#### Offloading scripts

A key diffefrentiator of the web-fragments approach, is that the fragment (or micro-frontend) scripts are not only loaded but also offloaded when browsing away from a reframed view, with the consequent release of memory and mitigation of memory leaks.

To learn more about it, go to the [reframed](./reframed) document.

## Eager-rendering or piercing

Eager-rendering is the process of rendering a server side rendered fragment, before a client-side legacy application has been bootstrapped.

To do so, the middleware rewrites the HTML for the document in the response, embedding the fragment before the application renders client-side. The fragment is immediately interactive boosting `Interactive to Next Paint` scores, and `prePiercingStyles` prevent `Cummulative Layout Shift` and `Largest Content Paint`. To know more about performance metrics, visit [this page](https://web.dev/articles/vitals)

### Rewriting the HTML

Our team uses the [browser and Node.js version](https://github.com/remorses/htmlrewriter) of [HTML rewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/) to manipulate the streams and rewrite the resulting HTML, in our middleware.

This is an example of rewriting the HTML before reframing

```javascript
{
// other code
...
// process the fragment response for embedding into the host document

	/**
	 * Embeds a fetched fragment into the host HTML document.
	 * @param {Response} hostResponse - The response object of the host HTML.
	 * @param {FragmentConfig} fragmentConfig - Configuration object for the fragment.
	 * @returns {Function} - A function that processes and integrates the fragment response.
	 */
	async function embedFragmentIntoHost({
		hostInput,
		fragmentResponse,
		fragmentConfig,
		gateway,
	}: {
		hostInput: Response;
		fragmentResponse: Response;
		fragmentConfig: FragmentConfig;
		gateway: FragmentGatewayConfig;
	}) {
		const { fragmentId, prePiercingClassNames } = fragmentConfig;
			console.log('[[Debug Info]: Fragment Config]:', { fragmentId, prePiercingClassNames });
			// @ts-ignore
			const { prefix: fragmentHostPrefix, suffix: fragmentHostSuffix } = fragmentHostInitialization({
					fragmentId,
					classNames: prePiercingClassNames.join(' '),
					content: '',
				});
			const fragmentContent = await fragmentResponse.text();

			return new HTMLRewriter()
				.on('head', {
					element(element: any) {
						console.log('[[Debug Info]: HTMLRewriter]: Injecting styles into head');
						element.append(gateway.prePiercingStyles, { html: true });
					},
				})
				.on('body', {
					element(element: any) {
						const fragmentHost = fragmentHostInitialization({
							fragmentId,
							classNames: prePiercingClassNames.join(' '),
							content: fragmentContent,
						});
						console.log('[[Debug Info]: Fragment Response]: Received HTML content', typeof fragmentContent);
						element.append(fragmentHost.prefix, { html: true });
						element.append(fragmentHost.suffix, { html: true });
					},
				})
				.transform(hostInput);
	}
}


```

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
