---
title: "Elements"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: March 13, 2025

Web Fragments uses `custom elements` as an implementation detail to embed applications in an existing user-interface. By using custom elements keep the implementation lightweight and benefit from using `shadowRoot` for style encapsulation.

Additionally, all scripts of the fragment application execute in an isolated JavaScript context.

## Custom elements registration

Before using the Web Fragments on the client-side of an application, the library needs to be initialized via exported `initializeWebFragments()` function:

```javascript
import { initializeWebFragments } from "web-fragments";

initializeWebFragments();
```

This initialization should occur as early as possible during the bootstrap of a the existing application.

Please notice that different frameworks may require additional utilities to work with `custom elements`. For example `Angular` needs `CUSTOM_ELEMENTS_SCHEMA` to be provided.

## `<web-fragment>` element

`<web-fragment>` is a custom element reponsible for marking the location in the existing application where a Web Fragment should be nested.

`<web-fragment>` have a `fragment-id` attribute to identify the fragment to be nested.

```html
<fragment-outlet fragment-id="some-id"></fragment-outlet>
```

By default, `<web-fragment>` will create a bound fragment, which shares (binds) `window.location` and navigation history with the existing application that contains the fragment.
Navigation initialized from the existing application, or a web fragment will be reflected in both.

Optionally, a fragment can be created with the `src` attribute.
This will cause a creation of an "unbound" fragments, which has it's own `window.location` and history, both of which are independent of that of the rest of the application or other fragments.

## Fragment Host Client-Side

When the application runs and the `fragment-outlet` element `connectedCallback` is callled, it dispatches the 'fragment-outlet-ready' event and, when not already in place a `fragment host` custom element is mounted and nested inside of the `fragment-outlet`, taking its `fragment-id`.

From that moment on, the following `fragment-host` lifecycle take place:

1. the `fragment-outlet-ready` event is registered
2. a the `fragment-host` is checked for the presence of a `shadow-root` that is created when not in place. it is the initial HTML of the fragment
3. b otherwise, to bootstrap the fragment:
   - the `location.href` is captured
   - it is then used to make a fetch GET request to the gateway
   - the returned server-side rendered HTML stream is used to populate the `shadow-root` of the `fragment-host`
4. a new reframed container (iframe) is created, all script tags from the initial fragment HTML (that were neutralized with the inert property) are copied into the the reframed iframe and executed
5. if `fragment-outlet-ready` event fires, portaling of the fragment takes place
   - DOM state (`activeElement`, `textSelection`, etc), of the fragment is captured
   - `fragment-host` element is appended as a child of the `fragment-outlet`
   - DOM state previously captured, is restored

Steps 1 and 4 only apply when we're performing [server-side piercing](#server-side-piercing)

## Server-side piercing

Server-side piercing refers to he process through which the legacy app shell is combined with the server-side rendered HTML stream of a fragment.

It allows the eager display and initialization of a fragment at the moment of bootstrapping the shell application.

[piercing-styles](./glossary#eager-rendering-piercing) configured during fragment registration, help positioning the fragment in the correct slot.

![web fragments middleware](../../assets/images/wf-middleware.drawio.png)

## Middleware

Middleware in place will be responsible for intercepting all requests coming from the legacy application, identifying those that match with a fragment request using the `routePattern` in the fragment registration configuration, handling scripts and other assets and embedding the resulting fragment content.

Learn more about [middleware](./elements.md) and the Web Fragment mechanisms that port fully working independent applications to be embedded in a functional, legacy shell user interface, in the [middleware](./middleware) section.

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
