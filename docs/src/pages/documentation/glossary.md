---
title: "Glossary"
layout: "~/layouts/MarkdownLayout.astro"
---

Learning a new framework comes with a lot of new terminology to learn. To make it easier, we have compiled a glossary of terms that are present in our documentation and other content.

## Custom Element registration

The standard mechanism to register `custom elements` in the `DOM` as per the [specification](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)

## Eager-rendering (piercing)

Eager-rendering refers to the reframing and portaling of a fragment server-side and returned as a stream, rendering on the page before the legacy application (typically a Client-side rendered app) is bootstrapped. The fragment is then available and interactive, before the rest of the application has even rendered, with a consequent boost in performance.

## Fragment

An independent application exposed as an http endpoint.

## Fragment Outlet

The `fragment-outlet` acts as a placeholder for the `web-fragment` in the legacy shell application and it either adopts an existing `fragment-host` or creates a new one. It is uniquely identified by its `fragment-id` attribute which is used to match it with its `fragment-host`.

## Fragment Host

The `fragment host` is container element for a `fragment`. Its `shadow-root` will contain all of the fragment's DOM elements. All of the fragment's code executes in a reframed container associated with its host.

## Portaling

It is a process through which the eagerly-rendered fragment is moved into the DOM tree of the legacy application.

## Reframing

The process through which we isolate the execution of fragment's scripts. Each fragment's code executes in its dedicated JavaScript context, whose lifecycle is attached to the lifecycle of the fragment's host.

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
