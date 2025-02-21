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

When the application runs and the `fragment-outlet` element `connectedCallback` is callled, it dispatches the 'fragment-outlet-ready' event and, when not already in place a `fragment host` custom element is mounted and nested inside of the `fragment-outlet`, taking its `fragment-id`.

From that moment on, the following `fragment-host` lifecycle take place:

1. the `fragment-outlet-ready` event is registered
2. a the `fragment-host` is checked for the presence of a `shadow-root` that is created when not in place. it is the initial HTML of the fragment
2. b otherwise, to bootstrap the fragment:
	- the `location.href` is captured
    - it is then used to make a fetch GET request to the gateway
	- the returned server-side rendered HTML stream is used to populate the `shadow-root` of the `fragment-host`
3. a new reframed container (iframe) is created, all script tags from the initial fragment HTML (that were neutralized with the inert property) are copied into the the reframed iframe and executed
4. if `fragment-outlet-ready` event fires, portaling of the fragment takes place
	 - DOM state (`activeElement`, `textSelection`, etc), of the fragment is captured
	 - `fragment-host` element is appended as a child of the `fragment-outlet`
	 - DOM state previously captured, is restored

Steps 1 and 4 only apply when we're performing [server-side piercing](#server-side-piercing)

## Server-side piercing

Server-side piercing refers to he process through which the legacy app shell is combined with the server-side rendered HTML stream of a fragment.

It allows the eager display and initialization of a fragment at the moment of bootstrapping the shell application.

[pre-piercing-styles](./glossary#eager-rendering-piercing) configured during fragment registration, help positioning the fragment in the correct slot.

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
