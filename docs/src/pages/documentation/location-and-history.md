---
title: "Shared Location API and History API"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: March 17, 2025

## Web fragments and browser location and history

One of the user experience benefits of Web Fragments as opposed to other composability patterns and technologies, is the ability of a web fragment provide consistent and intuitive browser navigation experience.

This is achieved by enabling the internal routing of a web fragment to share the browser location and history with the top level application. This is sharing is transparent to the application running as a web fragment, and it works in spite of the fragment running in a separate execution context.

### Bound web fragment

By default, web fragments are bound fragments. We call them bound because their `window.location` and browser history management is bound to that of the top level app.
When a navigation occurs from within a fragment, it is reflected in the browser's address bar and history. Conversely, hitting the browser back and forward buttons will also change the internal route of the fragment.

A bound web-fragment only needs an id, to be embedded.

```html
<web-fragment fragment-id="my-bound-fragment-id" />
```

### Unbound web-fragment

However, it may be the case that a web fragment may not need to share the location with the hosting shell. You can think of a payment application use-case, where after payment completed, the user is redirected to a new screen that describes the success or failure. You may not want that instance to change the URL of the browser or be accessible via the History API.

To create unbound fragment, you'll need to specify it's initial location via the `src` attribute.

```html
<web-fragment fragment-id="my-unbound-fragment-id" src="/my-unbound-fragment-source" />
```

The `src` should map to a url that matches a `routePatterns` pattern the web fragment's registration.

Please take a look at our official migration demo for an example of bound and unbound web-fragment, where the [catalog](https://github.com/anfibiacreativa/web-fragments-migration-demo/tree/main/packages/micro-frontend-app/nuxt-product-catalog) app is [bound](https://github.com/anfibiacreativa/web-fragments-migration-demo/blob/b6a2d8d18462cc48b738244c4211929c00b2b040/packages/micro-frontend-app/react-shell-app/src/routes/store.tsx#L22) and the [cart](https://github.com/anfibiacreativa/web-fragments-migration-demo/tree/main/packages/micro-frontend-app/qwik-shopping-cart) is [unbound](https://github.com/anfibiacreativa/web-fragments-migration-demo/blob/b6a2d8d18462cc48b738244c4211929c00b2b040/packages/micro-frontend-app/react-shell-app/src/routes/store.tsx#L24)
