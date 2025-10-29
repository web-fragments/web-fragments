---
title: "Gateway"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: March 19, 2025

## What is the Fragments Gateway

The fragment gateway enables web fragments and the application containing them to live on a single origin.
Operating the micro-frontend deployment on a single origin avoid configuration overhead and performance issues of cross-origin requests.

The gateway routes all requests from the browser to the right destination — either the existing application, fragment endpoints, or both.

The fragment gateway is implemented as a lightweight middleware that is compatible with both Node.js or Web based request/response APIs.

## Gateway usage

Before a gateway can be installed as a middleware, it needs to be configured.

```javascript
import { FragmentGateway } from "web-fragments/gateway";

const gateway = new FragmentGateway(config);
```

A fragment gateway configuration object can define `piercingStyles` which can position fragments during piercing (early rendering of fragments):

```javascript
// Gateway instantiation
// Piercing styles are only necessary for eager-rendering or piercing, to make sure the fragment
// is placed in the right position and there is no content-layout-shift, once the legacy
// application is bootstrapped
const gateway = new FragmentGateway({
	prePiercingStyles: `<style id="fragment-piercing-styles" type="text/css">
      web-fragment-host[data-piercing="true"] {
        position: absolute;
        z-index: 1;
      }
    </style>`,
});
```

Afterwards, one or more fragments can be registered with the gateway using the `registerFragment` method.

For example a shopping cart application fragment hosted remotely and being fetched, can be registered like this:

```javascript
gateway.registerFragment({
	fragmentId: "cart",
	piercingClassNames: ["cart"],
	routePatterns: ["/_fragment/cart/:_*", "/shop/:_*"],
	endpoint: "https://mycart.example.com",
	// Optional: specify which headers to forward to the fragment
	forwardFragmentHeaders: ["accept-language", "user-agent", "cookie"],
});
```

### Fragment Configuration Options

| Parameter                | Required | Description                                                                                                                                                                                                                                                                                                               |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fragmentId`             | Yes      | A unique identifier for the fragment. This matches the `fragment-id` attribute in your `<web-fragment>` element.                                                                                                                                                                                                          |
| `endpoint`               | Yes      | The location of your fragment. Can be:<br/>• An HTTP URL (e.g., `"https://mycart.example.com"`)<br/>• A Cloudflare Service Binding (e.g., `env.FRAGMENT_SERVICE.fetch.bind(...)`)<br/>• Any function that accepts `Request` and returns `Promise<Response>`                                                               |
| `routePatterns`          | Yes      | Array of URL patterns that route to this fragment. Uses wildcard syntax:<br/>• `/shop/:_*` matches `/shop` and all nested paths<br/>• `:_*` captures everything after that point<br/>• Include both app routes (`/shop/:_*`) and asset routes (`/__wf/cart.example.com/:_*`)                                              |
| `piercingClassNames`     | No       | CSS class names to apply during server-side piercing for positioning.                                                                                                                                                                                                                                                     |
| `forwardFragmentHeaders` | No       | Array of header names to forward to the fragment.<br/>• Reduces payload size by only forwarding necessary headers<br/>• Improves security by not leaking sensitive headers<br/>• Common values: `['accept-language', 'user-agent', 'cookie', 'authorization']`<br/>• Default: Most headers are forwarded if not specified |

## Installing the Middleware

After configuring your gateway, you need to install it as middleware in your application. Web Fragments provides two middleware adapters:

### Web (Fetch API) Middleware

For platforms that use the standard Fetch API (Cloudflare, Deno, Bun, modern edge runtimes):

```javascript
import { getWebMiddleware } from "web-fragments/gateway";

const middleware = getWebMiddleware(gateway, {
	mode: "production", // or 'development'
});

// Use with your platform's middleware system
export default {
	async fetch(request, env, ctx) {
		return middleware(request, async () => {
			// Fallback handler - serves your app shell or returns 404
			return new Response("Not Found", { status: 404 });
		});
	},
};
```

The `mode` option affects logging and error handling:

- **`production`**: Minimal logging, errors are caught gracefully
- **`development`**: Verbose logging, detailed error messages

### Node.js Middleware

For Express, Connect, and other Node.js frameworks:

```javascript
import { getNodeMiddleware } from "web-fragments/gateway/node";
import express from "express";

const app = express();
app.use(getNodeMiddleware(gateway));
```

See also:

- [Cloudflare Workers deployment guide](./cloudflare-workers)
- [Express example](https://github.com/web-fragments/web-fragments/blob/main/e2e/node-servers/app/server/src/express.ts)
- [Connect example](https://github.com/web-fragments/web-fragments/blob/main/e2e/node-servers/app/server/src/connect.ts)

## Requirements and conventions

A typical fragment has two kinds of URL patterns which you need to configure in `routePatterns` of a web fragment configuration:

- **The routable URL pattern** — navigating to a URL matching this pattern with the browser should invoke a fragment.
- **The asset URL pattern** — a pattern which uniquely identifies static assets belonging to a particular fragment. We recommend using `/__wf/<fragment-id>/` prefix to ensure uniqueness and avoid conflicts.

### Understanding Route Pattern Wildcards

The `:_*` syntax is a wildcard that matches everything following that position:

- `/shop/:_*` matches:

  - `/shop`
  - `/shop/cart`
  - `/shop/products/123`
  - `/shop/checkout/payment/confirm`

- `/__wf/cart.example.com/:_*` matches:
  - `/__wf/cart.example.com/main.js`
  - `/__wf/cart.example.com/styles/app.css`
  - `/__wf/cart.example.com/assets/images/logo.png`

This wildcard approach ensures that both your fragment's main route and all its nested routes and assets are properly routed through the gateway.

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
    <li class="author"><a href="https://github.com/eduardo-vargas">Eduardo-Vargas</a></li>
</ul>
