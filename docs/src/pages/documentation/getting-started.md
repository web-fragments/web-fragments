---
title: 'Getting Started with Web Fragments'
layout: '~/layouts/MarkdownLayout.astro'
---

_Last updated_: November 30, 2024

Getting started with Web Fragments is easy

## Installation

Install Web Fragments as a dependency to your legacy application or shell app. If you want to better understand what a shell is, you can refer to our [architecture documentation](../architecture/architecture)

```bash
$ npm install web-fragments
```

## Register the custom elements

Once you have installed the library, you can [register](./elements/#register-the-custom-elements) the `Fragment Outlet` and `Fragment Host` custom elements.

Custom elements registration may have additional requirements depending on your shell's tech stack. Please follow guidelines for your specific technology, or refer to [custom elements standard registry docs](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry)

## Place the outlet in the HTML of your legacy application

Once the migrated application has been developed, a team can place a `<fragment-outlet>` element exactly where the original legacy component was placed in the application, replacing the code. This will act as a placeholder to identify where exactly the `fragment`should be embedded. 

The `<fragment-outlet>` should have a `fragment-id` and `src` attribute that will be used by the corresponding [middleware](./middleware) to match and fetch the corresponding fragment from the remote route.

```html
<!-- Fragment Outlet example -->
 <fragment-outlet fragment-id="qwik" src="/cart"></fragment-outlet>
```

## Initializing and registering the fragment in the gateway

Apart from registering the custom elements, `fragments` must be registered in the [fragment gateway](./gateway). In order to do so, the gateway must be imported to the server application.

A detailed guide can be found in the [fragment gateway](./gateway) section.

--------------
#### Authors
<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>