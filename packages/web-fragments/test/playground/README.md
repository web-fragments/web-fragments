# Web Fragments Playground & Testing Harness

## How to use

The Web Fragments' development and testing setup relies on Vite (code preprocessing & dev server support), Playwright (browser management & test authoring), and a collection of static HTML pages and client-side rendered mini-applications.

### Pre-requisites

Ensure all dependencies are installed:

```sh
pnpm install
pnpm install-browsers
```

### Common commands

Run all tests:

```sh
pnpm test
```

Start the (vite) dev server with HMR support:

```sh
pnpm dev
```

Start the (vite) preview server (no HMR):

```sh
pnpm preview
```

### VSCode development support

Playwright which is used for authoring and running all tests has a very good [VSCode extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) which allows you to run and rerun (individual) tests, which is handy during development.
To install the extension do the following:

- cmd + shift + p
- type `Show Recommended Extensions`
- install all

Afterwards navigate to any `spec.ts` file and you can run any tests by clicking the green ▶️ button next to each `test` statement, or you can run all tests via the Playwright extension panel.

## How to write tests

To create a new scenario, create a new directory, let's say `fragment-creation`, in this folder with the following files:

- `<scenario-name>/index.html` — this file represents the host application document that contains fragment(s)
  - if you need to add css styles or JavaScript, please inline them using `<style> // styles here </style>` or `<script> // script here </script>` to keep things simple and avoid external references
  - external resources are supported, but will bundled and even inlined by Vite, if this is undesirable, mark the resources with `vite-ignore` attribute, and place the files into `public/<scenario-name>/` folder
- one or more `<scenario-name>/fragment.html` files — representing the html of a fragment
  - just like with `index.html`, inlined resources are preferable, but external resources are supported as well
  - all `fragment.html` files are registered automatically with the fragment gateway via `vite.config.ts` as bound fragments with piercing disabled (for now)
- `<scenario-name>/spec.ts` — the Playwright spec file containing the actual test

You can now open the scenario in a browser with:

- `pnpm run dev`
- open `http://localhost:5173/<scenario-name>/`
- you can also navigate to the fragment directly (in the standalone mode) by opening `http://localhost:5173/<scenario-name>/fragment`

For convenience, please add the scenario to the top level `index.html` following the established pattern.

## Why this harness works the way it does?

Web Fragments rely on complex interactions between multiple Document instances, iframes, and other browser APIs.
This makes testing requirements for the code base quite distinct from most JS code, and more traditional testing approaches like those based on Vitest or Jest could result in false results or inability to cover complex scenarios faithfully.

This customized testing harness was developed to support the development with the following requirements in mind:

- testing with real browsers and against real DOM implementations
- support for cross-browser testing
- support for test automation, and CI integration
- support for easy, reliable, and fast debugging in real browsers
- ability to create targeted scenarios in isolation and with minimal (configuration) overhead

In order to ensure the tests are fast to develop `pnpm dev` and VSCode Playwright extension utilize Vite's HMR for fast and reliable code reloading.

To ensure that tests run reliably, `pnpm test` runs against the production build for all scenarios, not relying on HMR code loader and thus minimizing a possibility of the code-preprocessing introducing interference, which would render the tests unreliable.

All three of `pnpm dev`, Playwright's VSCode extension, and `pnpm test` run their web server on unique ports to ensure that we don't accidentally mix up the servers and run tests against stale version of the code.

### Why not support Server Side Rendering (SSR) in the testing harness?

As you might have noticed, none of the scenarios work with SSR-ed fragments.
This is intentional, as adding SSR support would add unnecessary complexity.
It is possible to enable piercing and treat `fragment.html` as SSRed response — we just haven't gotten around to that yet.

Note that our end-to-end test suite under `/e2e/` contains several applications that exercise Web Fragments against SSR-ed or full-stack applications, but those tests are higher level, and not as focused as the tests in this test suite.

### Does the playground use Fragment Gateway middleware?

Yes. It's configured via `vite.config.ts` and automatically registers all found `fragment.html` files as bound fragments with piercing disabled (for now).
