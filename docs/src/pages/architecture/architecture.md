---
title: "Web Fragments Architecture"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: December 8, 2024

**The [Web Fragments](https://github.com/web-fragments/web-fragments/) architecture relies on the principles of agnosticism, incremental adoption and low risk.**

## Web Fragments Core Components

### Fragment Gateway

Acts as a central hub for managing and registering fragments.
Fragments are registered here and are then initialized and routed to appropriate consumers.

### Reframed

This is a client-side library or framework responsible for managing the lifecycle of fragments.

#### Functions include:

- Creating containers `<fragment-host>` or `<iframe>` Context.
- Generating Shadow DOM (shadowRoot) for encapsulation.
- Neutralizing scripts to prevent script conflicts across fragments.

### Server Middleware

- Plays a backend role to match fragments.
- Handles requests and processing tasks to fetch fragments or route them to the correct destination.
- Communicates with upstream servers if additional processing or content fetching is needed.

### Remote Upstream

This component represents a remote application that provides the static code and assets.

### Application shell

This refers to the legacy application that hosts the fragments

## Flow

### Fragment Initialization:

- Fragments are initialized in the client environment using Reframed.
- The iframe context is created to encapsulate the script.
- The fragment placeholder `<fragment-host>` and the container are created, and a shadowRoot is added for encapsulating styles.

### Server Processing:

- Middleware matches the fragments based on requests from the client-side application.
- Middleware may forward requests to the defined remote upstream for fetching assets and data.

### Rendering and Context Management:

#### Fragments contexts:

- A `<fragment-outlet>` acting as a placeholder to a `<fragment-host>` (using Shadow DOM for isolation).
- An `<iframe>` context for strict isolation of scripts that are neutralized and reframed to avoid conflicts between fragments. This context is destroyed to offload scripts when not used, and release memory, mitigating potential leaks.

#### Asset Fetching:

Client-side components (Reframed) fetch required assets for each fragment, ensuring modularity.

#### Same-Origin Policies:

Ensures that fragments or data are securely fetched and processed while adhering to origin security rules.

![web fragments middleware](../../assets/images/wf-middleware.drawio.png)

## Use Cases

- This architecture is ideal for incrementally modernizing legacy applications by embedding isolated, reusable fragments.
- Decoupling teams by allowing independent development and deployment of fragments.
- Maintaining strict encapsulation and sandboxing of fragment styles and scripts.

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
