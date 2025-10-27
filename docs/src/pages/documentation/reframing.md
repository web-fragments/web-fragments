---
title: "Reframing"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: Oct 26, 2025

Reframing is a JavaScript and DOM virtualization technique unique to Web Fragments that provides isolation and encapsulation of an application running as a fragment, and prevents JavaScript collisions among fragments, and between the host application and fragments.

Each Web Fragment uses the `reframed` library that is an integral part of Web Fragments, to creates a clean JavaScript context into which all of the scripts associated with a given application are loaded and executed.

When a Web Fragment is destroyed, this JavaScript context is also destroyed, which frees up all the resources associated with the application.
This includes the data memory (objects created by the application), memory occupied by loaded code, the module registry, as well as any timers and listeners.

Reframing is a differentiating and crucial feature of Web Fragments, and is enabled by default for all fragments.

## How it works

Reframing utilizes a hidden iframe to create a clean JavaScript context that is used to load and evaluate all of scripts of the application running as a fragment.

The iframe is not a typical iframe though.
It is a same-origin iframe, that has its `window.location` synchronized with the host application's `window.location`.
It is also monkey-patched with very lightweight patches of DOM and JavaScript APIs to create an illusion that the iframe is the top level context and top level DOM document.

The goal of the monkey-patches is to preserve all of DOM and JavaScript APIs as they exist in the browser, but augment their implementation to perform the desired operation in the main DOM document, but scope it to the shadow DOM of the Web Fragment associated with the iframe.

In this way, all the iframe's DOM operations are "reframed" and safely executed in the main DOM document without causing collisions.
This is why the internal library as well as the technique are called "reframed" and "reframing" respectively.
