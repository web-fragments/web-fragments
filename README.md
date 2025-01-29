<!-- prettier-ignore -->
<div align="center">

<img src="./docs/src/assets/favicons/favicon.svg" alt="web-fragments-logo" align="center" height="64" />

# Web Fragments: A radically new architecture to build micro-frontends

[![Official documentation](https://img.shields.io/badge/Official%20Docs-8A2BE2?style=flat-square)](https://webfragments.dev/)
[![Our blog](https://img.shields.io/badge/Blog%20post-F28021?style=flat-square&logo=cloudflare&logoColor=white)](https://blog.cloudflare.com/better-micro-frontends)
[![New to micro-frontends?](https://img.shields.io/badge/Microfrontend.dev-2F80ED?style=flat-square)](https://microfrontend.dev)
[![Build Status](https://img.shields.io/github/actions/workflow/status/web-fragments/web-fragments/release.yml?style=flat-square&label=Release%20Status)](https://github.com/web-fragments/web-fragments/actions)
![Node version](https://img.shields.io/badge/Node.js->=20-3c873a?style=flat-square)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-white?style=flat-square)](LICENSE)

[Overview](#overview) | [Getting started](#getting-started) | [Usage](#usage) | [More Resources](#more-resources)

</div>

## Overview

Web Fragments are a radically new approach to Web Micro-frontends which is framework and platform agnostic. New to micro-frontends? Check out https://microfrontend.dev

This project is an early phase, but we are working on launching it for production use at Cloudflare very soon.

## Getting started

To get started install the package with your favorite package manager. For example

```bash
npm install web-fragments
```

## Usage

After having recreated a component of a user-interface as an independent application, you can use the customElement provided to add it to the frontend as a fragment. For example

```html
<fragment-outlet fragment-id="qwik-cart" src="/cart"></fragment-outlet>
```

You should also implement the corresponding middleware to intercept the requests matching the fragment-id, and triggering the reframing.

The best way to learn more is going to [our official documentation](https://webfragments.dev/). You can also check out the demos present in this repository. A good example to understand the building blocks of Web Fragments is [e2e/pierced-react/README.md](e2e/pierced-react/README.md)

## More resources

We blogged about the philosophy of our approach and published some early research on the Cloudflare blog. You can check out a post introducing the previous generation of Web Fragments: https://blog.cloudflare.com/better-micro-frontends.

We also blogged about how Web Fragments can enable incremental adoption of micro-frontends: https://blog.cloudflare.com/fragment-piercing

> Incremental adoption of micro-frontends with Cloudflare Workers
>
> Large frontend applications are often hard to improve without major investments. With Cloudflare Workers, our fragment-based micro-frontend architecture, and fragment piercing technique, engineering teams can incrementally improve large frontends in a fraction of the time, yielding significant user and developer experience gains.

This research and development is sponsored by Cloudflare:

<img src="https://github.com/user-attachments/assets/daee5d2d-174d-4679-80d5-29cc3b38a903" data-canonical-src="https://github.com/user-attachments/assets/daee5d2d-174d-4679-80d5-29cc3b38a903" width="300" />
