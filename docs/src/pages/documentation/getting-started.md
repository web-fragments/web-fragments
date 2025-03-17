---
title: "Getting Started with Web Fragments"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: March 17, 2025

Getting started with Web Fragments is easy.

## 1. Build a new web fragment

Web fragment is a standalone application built with any web tech stack and deployed anywhere as a regular HTTP endpoint.

Check out a simple example of a fragment at https://party-button.demos.web-fragments.dev/ and review the [source code on GitHub](https://github.com/web-fragments/party-button-fragment).

Web fragments can be as simple as a button, or as sophisticated as multi-tier full-stack applications, with deeply nested routes and layouts.

## 2. Embed the new fragment into your existing existing application

### 2a. Install web-fragments package

Install Web Fragments package as a dependency to your existing web application.

```bash
$ npm install web-fragments
```

<!--
Note: Is your existing frontend app not an npm/JavaScript project? You can still use Web Fragments! See advanced usage.
-->

### 2b. Initialize the client side Web Fragments library

Initialize Web Fragments library in the bootstrap client-side code of your existing application:

```js
import { initializeWebFragments } from "web-fragments";

initializeWebFragments();
```

This code is designed to be minimal, and should be invoked as early during your application bootstrap.
It will initialize the library and register `<web-fragment>` [custom element](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry).

### 2c. Replace parts of your existing application with web fragments

Identify a place in your existing application's HTML or templates where you'd like to embed a web fragment, and place `<web-fragment>` element there.

```html
<!-- Web Fragment example -->
<web-fragment fragment-id="party-button"></web-fragment>
```

The `fragment-id` attribute uniquely identifies the instance of the fragment in your application.
We'll register this id with the fragment gateway in the next step.

### 2d. Register your fragment with the fragment gateway

Web fragments rely on fragment gateway — a thin middleware — to route all requests from the browser to the right destination.
This enables us to reap the performance and maintenance benefits of operating the user-facing micro-frontend application on the [same origin](https://web.dev/articles/same-origin-policy).

For the gateway to understand how to route your web fragment's requests, the fragment needs to be registered with it.

```js
import { FragmentGateway } from "web-fragments/gateway";

// initialize the gateway
const myGateway = new FragmentGateway();

// register our fragment
myGateway.registerFragment({
	fragmentId: "party-button",
	prePiercingClassNames: [],
	endpoint: "https://party-button.demos.web-fragments.dev",
	routePatterns: [
		// url pattern for fetching all assets of this fragment, this pattern is determined by the fragment and should be unique:
		"/__wf/dev.web-fragments.demos.party-button/:_*",
		// routable url in the final application where this fragment will be initialized:
		"/",
	],
});
```

<!--
Apart from registering the custom elements, `fragments` must be registered in the [fragment gateway](./gateway). In order to do so, the gateway must be imported to the server application.

A detailed guide can be found in the [fragment gateway](./gateway) section.
-->

### 2e. Install fragment gateway as a middleware of your existing application

The final configuration step of is to add the fragment gateway as a middleware to your application.

If your existing application already has a middleware infrastructure, or it is deployed to a platform that natively supports middleware (for example Cloudflare, Netlify, or Vercel), then adding the fragment middleware is just a few lines of code.

For Web ([Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)) based middleware systems obtain a Web compatible middleware function and integrate it into your application:

```js
import { getWebMiddleware } from "web-fragments/middleware";

const middleware = getWebMiddleware(myGateway);

// Now follow a platform / router specific guide:
//
// - Cloudflare Pages: https://developers.cloudflare.com/pages/functions/middleware/
// - Netlify: https://docs.netlify.com/edge-functions/api/#modify-a-response
// - Vercel: https://vercel.com/docs/edge-middleware
// - Hono: https://hono.dev/docs/guides/middleware
```

For Node.js-based middleware systems like `express` or `connect` obtain a Node-compatible middleware function and integrate it into

```js
import { getNodeMiddleware } from "web-fragments/middleware/node";

// const app = express() or connect()

app.use(getNodeMiddleware(myGateway));
```

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
