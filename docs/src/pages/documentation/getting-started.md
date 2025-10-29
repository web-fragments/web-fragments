---
title: "Getting Started with Web Fragments"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: March 17, 2025

Getting started with Web Fragments is easy.

## 1. Create a new web fragment

Web fragment is a standalone application built with any web tech stack and deployed anywhere as a regular HTTP endpoint that serves HTML, static assets, and if required by the application, also handles form submissions, data requests, and other kinds of HTTP requests.

Check out a simple example of a fragment at https://party-button.fragments.demos.web-fragments.dev/ and review the [source code on GitHub](https://github.com/web-fragments/party-button-fragment).

Web Fragments can be as simple as a button, or as sophisticated as multi-tier full-stack applications, with deeply nested routes and layouts.

## 2. Embed the new fragment into your existing existing application

### a. Install the `web-fragments` package

Install the `web-fragments` package as a dependency to your existing web application.

```bash
$ npm install web-fragments
```

**Platform Support**: Web Fragments works with any modern JavaScript runtime. While this guide focuses on npm-based projects, the library is compatible with any environment that supports modern Web APIs (Fetch, Custom Elements, Shadow DOM).

### b. Initialize the client side Web Fragments library

Initialize the web fragments library in the bootstrap client-side code of your existing application:

```js
import { initializeWebFragments } from "web-fragments";

initializeWebFragments();
```

This code is designed to be minimal and has zero side effects beyond registering the custom element. It should be invoked as early as possible during your application bootstrap—ideally before any rendering happens.

What does this do? It registers the `<web-fragment>` [custom element](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry) with the browser, making it available for use in your HTML or JSX templates. Think of it like importing and registering a component in your framework, except this registration is at the browser level.

### c. Replace parts of your existing application with web fragments

Identify a place in your existing application's HTML or templates where you'd like to embed a web fragment, and place `<web-fragment>` element there.

```html
<web-fragment fragment-id="party-button"></web-fragment>
```

The `fragment-id` attribute uniquely identifies this fragment in your application. This ID must match the `fragmentId` you'll register with the gateway in the next step—it's how the gateway knows which fragment endpoint to route requests to.

For initial testing, you can add the fragment to any page or route in your application. Just remember: the URL where this page lives should be included in the `routePatterns` configuration you'll set up in the gateway. For example, if you place this on a page at `/dashboard`, you'll need `/dashboard/:_*` in your route patterns.

**Framework Examples**:

```jsx
// React/JSX
export const DashboardPage = () => (
	<div>
		<h1>Dashboard</h1>
		<web-fragment fragment-id="party-button"></web-fragment>
	</div>
);
```

```html
<!-- Vue template -->
<template>
	<div>
		<h1>Dashboard</h1>
		<web-fragment fragment-id="party-button"></web-fragment>
	</div>
</template>
```

```html
<!-- Plain HTML -->
<div>
	<h1>Dashboard</h1>
	<web-fragment fragment-id="party-button"></web-fragment>
</div>
```

### d. Register your fragment with the fragment gateway

Here's where things get interesting. Web Fragments uses a lightweight middleware - _the fragment gateway_ - to coordinate all the moving parts. The gateway sits in front of your application and routes requests to the right destination: your existing app, or one of your fragments.

Why do we need this? The gateway enables you to operate your entire micro-frontend application on a single origin, which brings huge benefits:

- **No CORS headaches**: Everything shares the same origin
- **Better performance**: No cross-origin preflight requests
- **Simpler security**: The [same-origin policy](https://web.dev/articles/same-origin-policy) works in your favor
- **Unified deployment**: One domain, multiple independent services behind it

Think of the gateway as a smart router that inspects each incoming request and says, "This request is for the shell app," or "This request is for the party-button fragment," and routes accordingly.

For the gateway to make these routing decisions, you need to tell it about your fragments:

```js
import { FragmentGateway } from "web-fragments/gateway";

// Initialize the gateway
const myGateway = new FragmentGateway();

// Register our fragment
myGateway.registerFragment({
	// A unique ID matching the fragment-id attribute in your HTML
	fragmentId: "party-button",
	// The endpoint where your fragment is hosted
	// This can be an HTTP URL, or a Service Binding on Cloudflare
	endpoint: "https://party-button.demos.web-fragments.dev",

	// Route patterns tell the gateway which URLs belong to this fragment
	routePatterns: [
		// Assets pattern: uniquely identifies this fragment's static files
		// The :_* is a wildcard that matches everything after this point
		"/__wf/party-button.demos.web-fragments.dev/:_*",

		// Application pattern: where in your app this fragment appears
		// Adjust this to match where you placed the <web-fragment> element
		"/",
	],

	// Optional: CSS classes for positioning during server-side piercing
	piercingClassNames: [],
});
```

Let's break down the `routePatterns`:

- The **asset pattern** (`/__wf/.../:_*`) captures requests for the fragment's JavaScript, CSS, images, etc.
- The **application pattern** (`/`) captures navigation to pages where the fragment should render
- The `:_*` wildcard means "match this path and everything after it"

If you placed your `<web-fragment>` on a `/dashboard` page instead of the root, you'd use `"/dashboard/:_*"` as the application pattern.

### e. Install the fragment gateway as middleware

The final configuration step is to install the gateway as middleware in your application. This middleware intercepts all requests and makes the routing decisions mentioned above.

The installation looks different depending on your deployment platform. Web Fragments provides adapters for both modern Web (Fetch API) platforms and traditional Node.js servers.

#### For Modern Edge Platforms (Cloudflare, Deno, Bun)

If you're deploying to Cloudflare Workers, Deno Deploy, or similar platforms that use the standard [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API):

```js
import { getWebMiddleware } from "web-fragments/gateway";

const middleware = getWebMiddleware(myGateway, {
	mode: "production", // Use 'development' for verbose logging
});

// Example: Edge middleware platforms (with origin backend)
export default {
	async fetch(request, env, ctx) {
		return middleware(request, () => fetch(request));
	},
};
```

The middleware takes a **fallback function** that handles requests not matching any fragment routes. 

In this example, `fetch(request)` forwards the request to your origin server or backend - this works on platforms like **Cloudflare Pages, Netlify Edge, and Vercel Edge** where the middleware runs in front of an existing application.

**Note**: For standalone workers without an origin (e.g., Cloudflare Workers), you'll need a different approach like Assets binding. See the platform-specific guides below for complete implementations.

**Platform-Specific Guides**:

- **Cloudflare Workers**: See our comprehensive [Cloudflare Workers guide](./cloudflare-workers) for Service Bindings, Assets, and deployment best practices
- **Cloudflare Pages**: [Official middleware docs](https://developers.cloudflare.com/pages/functions/middleware/) + [example](https://github.com/web-fragments/web-fragments/blob/main/e2e/pierced-react/functions/_middleware.ts)
- **Netlify**: [Edge Functions API](https://docs.netlify.com/edge-functions/api/#modify-a-response)
- **Vercel**: [Edge Middleware docs](https://vercel.com/docs/edge-middleware)

#### For Node.js Servers (Express, Connect)

If you're using a traditional Node.js server with Express or Connect:

```js
import { getNodeMiddleware } from "web-fragments/gateway/node";
import express from "express";

const app = express();

// Install the middleware before your application routes
app.use(getNodeMiddleware(myGateway));

// Your existing routes come after
app.get("/", (req, res) => {
	res.sendFile("index.html");
});

app.listen(3000);
```

Order matters here: install the Web Fragments middleware before your application's route handlers so it can intercept fragment requests.

**Examples**:

- [Express integration](https://github.com/web-fragments/web-fragments/blob/main/e2e/node-servers/app/server/src/express.ts)
- [Connect integration](https://github.com/web-fragments/web-fragments/blob/main/e2e/node-servers/app/server/src/connect.ts)

### f. Build and deploy

Now build and deploy your existing application with the web fragment enhancements.

## 3. Enjoy

Once your application is deployed, you can navigate to the route on which the fragment was configured and you should see it embedded in your application, and fully functional.

Pressing the button shoots confetti throughout the entire viewport.
Interestingly, this special effect happens via [`canvas-confetti`](https://www.npmjs.com/package/canvas-confetti) a small but sophisticated npm library that uses web workers and offscreen canvas to create the effect.

This library, as well as the party-button application that uses it, run in a "virtualized" environment provided by Web Fragments, just like a native application runs in a Docker container, and is unaware of your existing application in which it was loaded, yet it has full access to the viewport, navigation, history, and more for full expressiveness.

### Explore the fragment using your browser's dev tools.

You can verify that the web fragment's DOM is part of the main document of your existing application, yet it is encapsulated within a [shadow root](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot), preventing styles collisions between your application's own and the fragment's styles.

You can also observe that a new JavaScript context called `wf:party-button` has been automatically created for the fragment.

This context is backed by a hidden `iframe` added to the main document, where all the scripts are loaded and execute.
Notice that if you delete the `<web-fragment fragment-id="party-button">` element from the document, the `wf:party-button` context will be removed as well, and with it, all the memory, JavaScript handlers, and scheduled tasks will be released! 🚀

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
