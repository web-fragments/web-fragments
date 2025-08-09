---
title: "Glossary"
layout: "~/layouts/MarkdownLayout.astro"
---

Learning a new framework comes with a lot of new terminology to learn. To make it easier, we have compiled a glossary of terms that are present in our documentation and other content.

## Fragment

An independent (mini) application exposed as an http endpoint.

## Fragment Endpoint

Is an http endpoint that hosts a fragment.
This endpoint hosts "component as a service".

## Application Shell (or app shell)

Existing legacy application, typically a single page application (SPA), that will have content migrated or modernized with Web Fragments.

## &lt;web-fragment&gt; element

The `<web-fragment>` element pin-points the location within an application shell, where the fragment should appear.

A `<web-fragment>` element either adopts an existing fragment if the shell application is just starting and the fragment was pierced into it, or fetches a new one from the gateway.

## &lt;web-fragment-host&gt; element

The `<web-fragment-host>` element is an internal element produced by the gateway during piercing, and serves as the container element for a web fragment.

The `shadowRoot` of a `<web-fragment-host>` will contain all of the fragment's DOM elements.

Any scripts declared via `<script>` elements present in a fragment's shadowRoot, will be intercepted, and executed in an isolated context via a technique called `reframing`.

The inert script elements will be present in the shadow DOM, because their absence could interfere with proper execution of the application loaded via a fragment.

## Piercing (eager-rendering)

Piercing, or eager-rendering refers to the capability of Web Fragments to inline the fragment response in the initial HTML stream of a single page application (SPA) when a client makes initial request to this SPA.

Piercing dramatically improves user experience, and reduces [Largest Contentful Paint (LCP)](https://web.dev/articles/lcp) and enables users to interact with portions of your application much sooner.

## Portaling

It is a process through which the pierced (eagerly-rendered) fragment is moved into the DOM tree of the legacy application under the `<web-element>` with the same `fragment-id`.

## Reframing

The process through which we isolate the execution of fragment's scripts. Each fragment's code executes in its dedicated JavaScript context, whose lifecycle is attached to the lifecycle of the `<web-fragment>` element.

## Fate-sharing

Fate-sharing is a design system principle that ensures that a system composed of many parts either works, assuming that all parts work, or a failure of any subsystem affects the whole system.

In Web frontend development this property is highly undesirable, and is increasingly becoming a problem for our ever-more-complex frontends developed by ever-growing teams and organizations.

One mistake by a team member responsible for a relatively insignificant feature, can result in a catastrophic performance regression or even functional failure of the entire application. The more developers, the more mistakes, the more frequent regressions and outages.

Check out [Fate-sharing and micro-frontends](https://igor.dev/posts/fate-sharing-and-micro-frontends/) blog post to learn more.

## Broadcast Channel API

A Web API that allows fragments to communicate and share state efficiently. It enables posting messages between fragments using a shared channel. See the [Broadcast Channel API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) for more details.

## Shadow DOM

A web standard that encapsulates the DOM and CSS of a fragment, ensuring style and script isolation. Learn more about the [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM).

## Largest Contentful Paint (LCP)

A performance metric that measures the time it takes for the largest visible content on a page to load. Piercing improves LCP by rendering fragments eagerly. See the [LCP Documentation](https://web.dev/lcp/) for more information.

## Fragment Gateway

A middleware that routes requests from the browser to the correct fragment endpoint. It ensures seamless integration of fragments into an application shell.

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
