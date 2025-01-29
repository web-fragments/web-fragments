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

Playwright which is used for authoring and running all tests has a very good VSCode extension which allows you to run and rerun (individual) tests, which is handy during development. To install the extension do the following:

- cmd + shift + p
- type `Show Recommended Extensions`
- install all

Afterwards navigate to any `spec.ts` file and you can run any tests by clicking the green ▶️ button next to each `test` statement, or you can run all tests via the Playwright extension panel.

## How to write tests

To create a new scenario, create a new directory, let's say `fragment-creation`, in this folder with the following files:

- `<scenario-name>/index.html` — this file is the host application which contains fragments
  - this file can contain inlined script and css tags which are preferable to external resources to keep things simple
  - external resources are supported, but will bundled and even inlined by Vite, if this is undesirable, mark the resources with `vite-ignore` attribute, and place the files into `public/<scenario-name>/` folder
- one or more `<scenario-name>/fragment.html` files — these files represent the html of a fragment
  - just like with `index.html`, inlined resources are preferable, but external resources are supported as well
  - for routable fragments, register the fragment's routable path with `fragmentGatewayMiddleware` in `vite.conf.ts`
- `<scenario-name>/spec.ts` — the Playwright spec file containing the actual test

You can now open the scenario in a browser with:

- `pnpm run dev`
- open `http://localhost:5173/<scenario-name>/`
- you can also navigate to the fragment directly (in the standalone mode) by opening `http://localhost:5173/<scenario-name>/fragment`

For convenience, also add the scenario to the top level `index.html` following the established pattern.

## Why this harness works the way it does?

Web Fragments rely on complex interactions between multiple Document instances, iframes, and other browser APIs.
This makes testing requirements for the code base quite distinct from most JS code, and more traditional testing approaches like those based on Vitest or Jest could result in false results or inability to cover complex scenarios faithfully.

This customized testing harness was developed to support the development with the following requirements in mind:

- testing with real browsers and against real DOM implementations
- support for cross browser testing
- support for test automation, and CI integration
- support for easy, reliable, and fast debugging in real browsers
- ability to create targeted scenarios in isolation and with minimal (configuration) overhead

In order to ensure the tests are fast to develop `pnpm dev` and VSCode Playwright extension utilize Vite's HMR for fast and reliable code reloading.

To ensure that tests run reliably, `pnpm test` runs against production build of all scenarios, which don't rely on HMR code loader and thus minimizing a possibility of the code-preprocessing introducing interference which would make tests less reliable.

All three of `pnpm dev`, Playwright's VSCode extension, and `pnpm test` run their web server on unique ports to ensure that we don't accidentally mix up the servers and run tests against stale version of the code.

### Why not support Server Side Rendering (SSR) in the testing harness?

As you might have noticed, none of the scenarios work with SSR-ed fragments.
This is intentional, as adding SSR support would add unnecessary complexity to the setup and would not enable us to exercise any additional functionality of Web Fragments core infra that can't be tested with static HTML or client-side rendered applications.

Note that our end-to-end test suite under `/e2e/` contains several applications that exercise Web Fragments against SSR-ed or full-stack applications, but those tests are higher level, and not as focused as the tests in this test suite.

### What's up with the custom middleware? Why not reuse a regular Fragment Gateway middleware?

This is work in progress. Vite relies on Connect style middleware which our gateway currently doesn't support.
Since only a small portion of the middleware is needed to support the testing harness, it was easier to create a one off middleware for this harness.
Once we have a proper middleware for Node.js / Connect, we should be able to move over to it and reuse it in this testing harness.
