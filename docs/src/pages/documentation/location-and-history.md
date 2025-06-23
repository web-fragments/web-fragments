---
title: "Shared Location API and History API"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: April 12, 2025

## Web Fragments and Browser Location and History

One of the key user experience benefits of Web Fragments, compared to other composability patterns and technologies, is the ability of a web fragment to provide a consistent and intuitive browser navigation experience.

This is achieved by enabling the internal routing of a web fragment to share the browser's `location` and `history` with the top-level application. This sharing is transparent to the application running as a web fragment and works even though the fragment operates in a separate execution context.

### Bound Web Fragment

By default, web fragments are bound fragments. They are called "bound" because their `window.location` and browser history management are tied to that of the top-level application. When navigation occurs within a fragment, it is reflected in the browser's address bar and history. Conversely, using the browser's back and forward buttons will also update the internal route of the fragment.

A bound web fragment only requires an ID to be embedded:

```html
<web-fragment fragment-id="bound-fragment-id" />
```

For more details on `window.location` and the History API, refer to the [Mozilla Developer Docs on the History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API).

### Unbound Web Fragment

In some cases, a web fragment may not need to share the browser's location with the hosting shell. For example, consider a payment application where, after completing a payment, the user is redirected to a new screen that describes the success or failure. In such scenarios, you may not want the fragment to modify the browser's URL or be accessible via the History API.

To create an unbound fragment, specify its initial location using the `src` attribute:

```html
<web-fragment fragment-id="unbound-fragment-id" src="/unbound-fragment-source" />
```

The `src` attribute should map to a URL that matches a `routePatterns` entry in the web fragment's registration configuration.

For more information on URL patterns, see the [Gateway Documentation](./gateway).

### Examples of Bound and Unbound Web Fragments

Refer to the official migration demo for examples of bound and unbound web fragments:

- The [catalog app](https://github.com/anfibiacreativa/web-fragments-migration-demo/tree/main/packages/micro-frontend-app/nuxt-product-catalog) is [bound](https://github.com/anfibiacreativa/web-fragments-migration-demo/blob/b6a2d8d18462cc48b738244c4211929c00b2b040/packages/micro-frontend-app/react-shell-app/src/routes/store.tsx#L22).
- The [cart app](https://github.com/anfibiacreativa/web-fragments-migration-demo/tree/main/packages/micro-frontend-app/qwik-shopping-cart) is [unbound](https://github.com/anfibiacreativa/web-fragments-migration-demo/blob/b6a2d8d18462cc48b738244c4211929c00b2b040/packages/micro-frontend-app/react-shell-app/src/routes/store.tsx#L24).
