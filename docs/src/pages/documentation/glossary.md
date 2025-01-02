---
title: "Glossary"
layout: "~/layouts/MarkdownLayout.astro"
---

Learning a new framework comes with a lot of new terminology to learn. To make it easier, we have compiled a glossary of terms that are present in our documentation and other content.

## Container tag

A container definition mapping to an `HTML element` that contains the portaled fragment. Default is `section`.

## Custom Element registration

The standard mechanism to register `custom elements` in the `DOM` as per the [specification](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)

## Eager-rendering (piercing)

Eager-rendering refers to the reframing and portaling of a fragment server-side and returned as a [stream]() [from Web](), rendering on the page before the legacy application (typically a Client-side rendered app) is bootstrapped. The fragment is then available and interactive, before the rest of the application has even rendered, with a consequent boost in performance.

## Fragment

A micro application portaled from a different origin.

## Fragment Outlet

The `fragment outlet` acts a placeholder for the `web fragment` and is responsible for initializing the reframing and portaling, by providing a `fragment-id` and `src`.

## Fragment Host

The `fragment host` is a host to a `shadow-root` that will teleport a fragment, once fetched from its origin, and embed it in the application.

## Portaling

The mechanism that takes place while reframing the application and fetching and transferring all static assets.

## Reframing

The mechanism that creates and destroys an iframe context as well as a container with its corresponding `shadowRoot` to embed the remote fragment, and manages all fragments events.

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
