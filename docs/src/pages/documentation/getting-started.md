---
title: "Getting Started with Web Fragments"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: November 30, 2024

Getting started with Web Fragments is easy

## Installation

Install Web Fragments as a dependency to shell app. If you want to better understand what a shell is, you can refer to our [architecture documentation](../architecture/architecture), but in a few words, we will refer to `shell` as the legacy app that will host the fragments.

```bash
$ npm install web-fragments
```

## Register the custom elements

Once you have installed the library, you can [register](./elements/#register-the-custom-elements) the `Fragment Outlet` and `Fragment Host` custom elements that are part of the Web Fragments client-side libraries.

Custom elements registration may have specific requirements depending on your shell's tech-stack. Please follow guidelines for your specific technology, or refer to [custom elements standard registry docs](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry).

The element's registration need to happen very early in your JavaScript bootstrapping or initialization cycle.

## Place the outlet in the HTML of your shell

Once an application has been developed to migrate an existing component or functionality of the legacy app to a new stack, a team can place a `<fragment-outlet>` element exactly in the HTML spot where the original legacy component existed in the application.

This will act as a placeholder to identify where the `fragment` container should be embedded.

The `<fragment-outlet>` is required to have a `fragment-id` and `src` attributes that will be used by the corresponding [middleware](./middleware) to match a fragment and get its content and assets from its upstream endpoint, by rerouting the requests. For this, all fragments need to have been registered in the corresponding server or function that runs your application middleware, when the [Fragment Gateway](#fragment-gateway) has been initialized.



```html
<!-- Fragment Outlet example -->
<fragment-outlet fragment-id="qwik" src="/cart"></fragment-outlet>
```

## Fragment Gateway

### Initializing and registering the fragment in the gateway

Apart from registering the custom elements, `fragments` must be registered in the [fragment gateway](./gateway). In order to do so, the gateway must be imported to the server application.

A detailed guide can be found in the [fragment gateway](./gateway) section.

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
