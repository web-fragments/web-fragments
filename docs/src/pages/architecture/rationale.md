---
title: "Web Fragments Rationale"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: March 18, 2025

## What's radically different about Web Fragments?

Unlike other micro-frontend technologies, Web Fragments focus on isolating individual micro-frontends from each other by executing their client-side JavaScript in separate JavaScript context, while enabling them to share the same DOM document, browser navigation and history.

Just like Docker enables containerization of applications, Web Fragments enable containerization of web frontends on the client-side, and by extension also on the server-side.

This JavaScript execution context isolation and low-overhead virtualization enables large monolithic web frontends to be broken up into smaller, independently developed and released web applications, that in production are composed into a single cohesive UI.
In this way Web Fragments enable scaling and incremental modernization of the frontend tech stack.

## Pushing the Web forward

Our long term goal is to help push the Web forward, which requires not only creating new architectures and technologies, but also enabling large applications to adopt them.

Enterprise frontends have historically lacked technological mobility.
Due to their size, risk-aversion, and inability to incrementally migrate from the past "state-of-the-art" tech stack or architecture to the current one, enterprise frontends have always been several generations behind on the latest frontend technology, often forgoing major developer experience and user experience advancements.

Web Fragments enable enterprises to modernize and scale their web frontends, with only minimal overhead, and no vendor lock-in.

<!--
**As developers wanting to push the Web forward, we know that progress is not linear.**

We know that progress is not linear and the modernization of application stacks and architectures, to integrate innovation leads to churn.

Multiple rendering strategies and approaches are now available, from the early MPA to SPA, client-side rendering, server-side rendering and hybrid approaches. This constant evolution and progress and optimization cycles, have _motivated frontend developers_ and framework authors, to move from developing client-side to adopt full-stack frameworks.

**This shift demands a new mental model.** Rendering pages server-side means having to introduce mechanisms to keep experiences dynamic and highly reactive like [hydration]() and, recently, [resumability](https://www.builder.io/blog/resumability-vs-hydration).

## Innovation adoption can be challenging

Small application developers building greenfield can adopt the latest and greatest from the get-go, but for the enterprise development teams, where brownfield is the norm, the ability to modernize their stacks and patterns is limited by monolithic coupling and SLAs.

**Big bang migrations are undersirable**; the way forward and out of a legacy monolith, must be incremental.

## Enabling mobility to move forward

We recognize the need for mobility end-to-end, from infrastructure to technical stacks to transition to micro-frontends with a strategy that prioritizes gradual, low-risk migration:

**Incremental Migration:** Empower development teams to adopt micro-frontends step-by-step, avoiding disruptive large-scale rewrites. This approach is ideal for existing projects seeking modernization without overhauling the entire codebase.

**Low-Risk Modernization:** Minimize operational risks by ensuring each migrated component is fully encapsulated. Isolated fragments seamlessly integrate with the existing system, allowing modernization to proceed without impacting other parts of the application.

**Optimized ROI:** Focus teams on modernizing the most critical parts of an application at the right time. This targeted approach accelerates innovation, ensuring new features and updates reach the market quickly, maximizing business value.

**Platform and Framework Agnostic:** Develop a solution built on web standards, designed to work seamlessly across diverse frameworks and platforms. This versatility ensures compatibility with a wide range of development environments and fosters long-term flexibility.

By following this strategy, cross-functional teams can modernize applications efficiently, maintaining stability and fostering innovation at their own pace.

## Are you ready for a new micro-frontends paradigm?

> What if we could take an enterprise monolithic frontend, carve out out pieces of the UI, develop and deploy them separately, and compose everything back into a single user interface and consolidated experience?

We can! Learn more about [Web Fragment architecture](./architecture) to find out how.
-->

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
