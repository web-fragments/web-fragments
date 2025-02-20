---
title: "Elements"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: December 8, 2024

Web Fragments uses `custom elements` as an implementation detail to embed applications in an existing user-interface. By using custom elements we ensure there is only one `Document Object Model` that's walkable and interactive while the `shadowRoot` keeps the fragment application styles encapsulated, to prevent `css` pollution and specifity problems.

Additionally, all scripts in the fragment application are encapsulated in an `iframe` element with a mechanism known as [reframing](./reframed.md)

## Custom elements registration

Before using the `web fragments` custom elements in an application, they must be registered by importing the `register` function provided.

Please notice that different frameworks may require additional utilities to work with `custom elements`. For example `Angular` needs `CUSTOM_ELEMENTS_SCHEMA` to be provided.

The library exports the following `register()` function:

```javascript
import { FragmentOutlet } from "./fragment-outlet";
import { FragmentHost } from "./fragment-host";

export function register() {
	window.customElements.define("fragment-outlet", FragmentOutlet);
	window.customElements.define("fragment-host", FragmentHost);
}
```

that should be executed early in the application bootstrapping.

```javascript
import { register } from 'web-fragments/elements';

register()
```

## Fragment Outlet

In the context of Web Fragments, a `fragment outlet` is a custom element, reponsible for setting up the `fragment-id` and triggering the Web Fragment `reframing`. The `fragment outlet` is then used as a placeholder to kick off the [portaling](./glossary#portaling)

```html
<fragment-outlet src="/some-url" fragment-id="some-id"></fragment-outlet>
```

## Fragment Host Client-Side

When the application runs and the `<fragment-outlet>` element `connectedCallback` is callled, it dispatches the 'fragment-outlet-ready' event and, when not already in place a `fragment host` custom element is mounted and nested inside of the `fragment-outlet`, taking its `fragment-id`.

From that moment on, the following `reframed` operations take place:

- the [reframing](./glossary#reframing) mechanism is initialized
- the first request for the `fragment` document is triggered by the `reframed` script
- the [middleware](./middleware) will now route all requests intercepted by the server to the application origin upstream
- the corresponding `fragment` document is embedded in the container tag, inside of the `fragment-host` shadowRoot
- all scripts returned by the fragment upstream are neutralized with an `inert` property
- a new iframe element and context are created and corresponding fragment scripts are portaled into it to be encapsulated


![web fragments middleware](../../assets/images/wf-middleware.drawio.png)


## Middleware

Middleware in place will be responsible for intercepting all requests coming from the legacy application, identifying those that match with a fragment request using the `routePattern` in the fragment registration configuration, handling scripts and other assets and embedding the resulting fragment content.

Learn more about [middleware](./middleware) and the Web Fragment mechanisms that port fully working independent applications to be embedded in a functional, legacy shell user interface, in the [middleware](./middleware) section.

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
