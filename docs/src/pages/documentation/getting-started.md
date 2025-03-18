---
title: "Getting Started with Web Fragments"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: March 17, 2025

Getting started with Web Fragments is easy.

## 1. Create a new web fragment

Web fragment is a standalone application built with any web tech stack and deployed anywhere as a regular HTTP endpoint that serves HTML, static assets, and if required by the application, also handles form submissions, data requests, and other kinds of HTTP requests.

Check out a simple example of a fragment at https://party-button.demos.web-fragments.dev/ and review the [source code on GitHub](https://github.com/web-fragments/party-button-fragment).

Web fragments can be as simple as a button, or as sophisticated as multi-tier full-stack applications, with deeply nested routes and layouts.

## 2. Embed the new fragment into your existing existing application

### a. Install the `web-fragments` package

Install the `web-fragments` package as a dependency to your existing web application.

```bash
$ npm install web-fragments
```

<!--
Note: Is your existing frontend app not an npm/JavaScript project? You can still use Web Fragments! See advanced usage.
-->

### b. Initialize the client side Web Fragments library

Initialize the web fragments library in the bootstrap client-side code of your existing application:

```js
import { initializeWebFragments } from "web-fragments";

initializeWebFragments();
```

This code is designed to be minimal, and should be invoked as early as possible during your application bootstrap.
It will initialize the library and register `<web-fragment>` [custom element](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry).

### c. Replace parts of your existing application with web fragments

Identify a place in your existing application's HTML or templates where you'd like to embed a web fragment, and place `<web-fragment>` element there.

```html
<web-fragment fragment-id="party-button"></web-fragment>
```

The `fragment-id` attribute uniquely identifies the instance of the fragment in your application.
We'll register this id with the fragment gateway in the next step.

For initial testing you can add the fragment to the root template of your application, or any route of your choosing.
In either case ensure that the routable location of the web fragment in the application matches the `routePatterns` configuration in the `FragmentGateway` below.

### d. Register your fragment with the fragment gateway

Web fragments rely on a thin middleware - the fragment gateway — to route all requests from the browser to the right destination.
This enables us to reap the performance and maintenance benefits of operating the user-facing micro-frontend application on a single origin, governed by the [same origin policy](https://web.dev/articles/same-origin-policy).

For the gateway to understand how to route your web fragment's requests, the fragment needs to be registered.

```js
import { FragmentGateway } from "web-fragments/gateway";

// initialize the gateway
const myGateway = new FragmentGateway();

// register our fragment
myGateway.registerFragment({
	// a unique ID of the fragment
	fragmentId: "party-button",
	// class names used during fragment piercing
	// this is an advanced feature and can be initially omitted
	prePiercingClassNames: [],
	endpoint: "https://party-button.demos.web-fragments.dev",
	routePatterns: [
		// url pattern for fetching all assets of this fragment, this pattern is determined by the fragment and should be unique:
		"/__wf/dev.web-fragments.demos.party-button/:_*",
		// routable url in the final application where this fragment will be initialized (adjust as needed per step 2c):
		"/",
	],
});
```

<!--
Apart from registering the custom elements, `fragments` must be registered in the [fragment gateway](./gateway). In order to do so, the gateway must be imported to the server application.

A detailed guide can be found in the [fragment gateway](./gateway) section.
-->

### e. Install fragment gateway as a middleware of your existing application

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

See also: [Cloudflare Pages example](https://github.com/web-fragments/web-fragments/blob/main/e2e/pierced-react/functions/_middleware.ts)

For Node.js-based middleware systems like `express` or `connect` obtain a Node-compatible middleware function and integrate it into

```js
import { getNodeMiddleware } from "web-fragments/middleware/node";

const app = express();

app.use(getNodeMiddleware(myGateway));
```

See also: [express example](https://github.com/web-fragments/web-fragments/blob/main/e2e/node-servers/app/server/src/express.ts) or [connect example](https://github.com/web-fragments/web-fragments/blob/main/e2e/node-servers/app/server/src/connect.ts)

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
