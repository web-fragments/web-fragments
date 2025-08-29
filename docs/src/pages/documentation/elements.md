---
title: "Elements"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: April 12, 2025

Web Fragments uses `custom elements` as an implementation detail to embed applications in an existing user interface. By using custom elements, the implementation remains lightweight and benefits from `shadowRoot` for style encapsulation.

Additionally, all scripts of a fragment application execute in an isolated JavaScript context, ensuring independence and security.

## Custom Elements Registration

Before using Web Fragments on the client side of an application, the library must be initialized via the exported `initializeWebFragments()` function:

```javascript
import { initializeWebFragments } from "web-fragments";

initializeWebFragments();
```

This initialization should occur as early as possible during the bootstrap of an existing application.

Please note that different frameworks may require additional utilities to work with `custom elements`. For example, `Angular` requires `CUSTOM_ELEMENTS_SCHEMA` to be provided.

## The `<web-fragment>` Element

`<web-fragment>` is a custom element responsible for marking the location in an existing application where a Web Fragment should be nested.

`<web-fragment>` has a `fragment-id` attribute to uniquely identify the fragment.

```html
<web-fragment fragment-id="some-id"></web-fragment>
```

By default, `<web-fragment>` creates a bound fragment, which shares (binds) `window.location` and navigation history with the existing application that contains the fragment. The `window.location` in a bound fragment is initialized to the current `window.location` of the top-level application. Navigation initiated from the existing application or a web fragment will be reflected in both contexts.

Optionally, a fragment can be created with the `src` attribute, which specifies the URL from which the fragment should be initialized. This will create an "unbound" fragment, which has its own `window.location` and history, both of which are independent of the rest of the application or other fragments.

Both bound and unbound fragments run in a dedicated JavaScript context through [reframing](./reframed.md) — a virtualization technique unique to Web Fragments.

## Server-Side Piercing

Server-side piercing refers to the process through which the legacy app shell is combined with the server-side rendered HTML stream of a fragment.

It allows the eager display and initialization of a fragment at the moment of bootstrapping the shell application.

[piercing-styles](./glossary#eager-rendering-piercing) configured during fragment registration help position the fragment in the correct slot.

![web fragments middleware](../../assets/images/wf-middleware.drawio.png)

## Routing of Fragment Requests

All requests initiated from the DOM or JavaScript of a fragment are intercepted by the fragment gateway middleware. This middleware sits in front of the legacy application, identifies requests originating from the fragment via the `routePattern` in the fragment registration configuration, and reroutes all asset requests to the correct fragment endpoint.

Learn more about middleware in the [gateway](./gateway) section.

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
