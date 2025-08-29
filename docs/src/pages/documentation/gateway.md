---
title: "Gateway"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: April 12, 2025

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
});
```

## Requirements and Conventions

A typical fragment has two kinds of URL patterns that need to be configured in the `routePatterns` of a web fragment configuration:

- **Routable URL Pattern**: Navigating to a URL matching this pattern with the browser should invoke a fragment. This is the entry point for rendering the fragment in an application.
- **Asset URL Pattern**: A pattern that uniquely identifies static assets belonging to a particular fragment. It is recommended to use the `/_fragment/<fragment-id>/` prefix to ensure uniqueness and avoid conflicts.

For example, a shopping cart fragment might use the following configuration:

```javascript
{
  fragmentId: "cart",
  piercingClassNames: ["cart"],
  routePatterns: ["/_fragment/cart/:_*", "/shop/:_*"],
  endpoint: "https://mycart.example.com",
}
```

By adhering to these conventions, fragments can be seamlessly integrated into an application while maintaining clarity and avoiding conflicts.

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
