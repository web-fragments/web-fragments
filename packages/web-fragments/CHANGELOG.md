# web-fragments

## 0.3.0

### Minor Changes

- [#126](https://github.com/web-fragments/web-fragments/pull/126) [`6644f9d`](https://github.com/web-fragments/web-fragments/commit/6644f9daf739ed3036022264f6cef2f88af586ee) Thanks [@IgorMinar](https://github.com/IgorMinar)! - feat: refactor cloudflare middleware to a generic web and node middleware

  This enables the Web Fragments gateway to be used in many different contexts, including node.

  The node support means express, connect, vite, storybook can now be integrated with web fragments too.

  The node implementation simply uses the web implementation that is wrapped into a node-to-web adapter, which ensures feature parity with the web implementation.

  Lots of tests were added to ensure the middleware works as expected.

  There is a bunch of additional cleanup in this PR that was hard to extract into a separate PR.

  BREAKING CHANGE: The cloudflare middleware has been removed. The new middleware is a generic web and node middleware.

  To migrate update the existing CF middleware to web middleware:

  ```js
  import { FragmentGateway, getWebMiddleware } from 'web-fragments/gateway';

  const gateway = new FragmentGateway({ ... });

  const middleware = getWebMiddleware(gateway, { mode: 'development' });

  export const onRequest = async (context) => {
  	const { request, next } = context;

  	return await middleware(request, next)
  };
  ```

## 0.2.3

### Patch Changes

- [#134](https://github.com/web-fragments/web-fragments/pull/134) [`fe32b14`](https://github.com/web-fragments/web-fragments/commit/fe32b1420fca443e968d6d9c46381193d5887ba2) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(reframed): correctly support window.visualViewport

  We need to read it from the main window.

- Updated dependencies [[`fe32b14`](https://github.com/web-fragments/web-fragments/commit/fe32b1420fca443e968d6d9c46381193d5887ba2)]:
  - reframed@0.1.4

## 0.2.2

### Patch Changes

- [#129](https://github.com/web-fragments/web-fragments/pull/129) [`66cf24d`](https://github.com/web-fragments/web-fragments/commit/66cf24d769fa0000bc0e8c1b8672b3228a552af3) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(reframed): correctly execute external scripts (`<script src="...">`)

  Previously we accidentally treated them as inline scripts that haven't been fully parsed and appended, which caused double execution of these scripts.

  This issue prevented Analog from bootstrapping correctly in reframed context.

- [#127](https://github.com/web-fragments/web-fragments/pull/127) [`2b53c14`](https://github.com/web-fragments/web-fragments/commit/2b53c14bc92e53427417cdf0c535ee12267458c2) Thanks [@IgorMinar](https://github.com/IgorMinar)! - Correctly support MutationObserver and ResizeObserver within fragments.

  Previously we didn't patch these, and since they were asked to observe DOM from the main frame
  the observers didn't work correctly.

- [#128](https://github.com/web-fragments/web-fragments/pull/128) [`5f26b87`](https://github.com/web-fragments/web-fragments/commit/5f26b8700fff3dd5db0bbdd97628ec66904f8f43) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(reframed): document.activeElement should always point to shadowRoot.activeElement

  Previously before we used shadowRoot in web fragments the active element in the fragment targeted main document's active element.
  But now that we require the use of shadowRoot, we must use shadowRoot.activeElement instead because otherwise activeElement is set to the element that owns the fragment's shadowroot.
  This issue caused the code in fragment to escape the shadowroot, which results in weird bugs.

- [#130](https://github.com/web-fragments/web-fragments/pull/130) [`142b8ed`](https://github.com/web-fragments/web-fragments/commit/142b8edd8245511c7caea14043829a2f70b6ceb1) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(reframed): node.ownerDocument should return fragment Document

  Any node within the fragment's shadowRoot should consider its ownerDocument to be the monkey patched Document from the reframed iframe.

  If we don't patch this, it's too easy for code to escape the shadowRoot boundary when traversing the DOM.

- [#130](https://github.com/web-fragments/web-fragments/pull/130) [`7654040`](https://github.com/web-fragments/web-fragments/commit/76540407fe88e3c1dab1d69b81626f79af1a1059) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(reframed): node.getRootNode() should return fragment's Document

  This is to ensure consistent behavior with the real DOM.

- Updated dependencies [[`66cf24d`](https://github.com/web-fragments/web-fragments/commit/66cf24d769fa0000bc0e8c1b8672b3228a552af3), [`2b53c14`](https://github.com/web-fragments/web-fragments/commit/2b53c14bc92e53427417cdf0c535ee12267458c2), [`5f26b87`](https://github.com/web-fragments/web-fragments/commit/5f26b8700fff3dd5db0bbdd97628ec66904f8f43), [`142b8ed`](https://github.com/web-fragments/web-fragments/commit/142b8edd8245511c7caea14043829a2f70b6ceb1), [`7654040`](https://github.com/web-fragments/web-fragments/commit/76540407fe88e3c1dab1d69b81626f79af1a1059)]:
  - reframed@0.1.3

## 0.2.1

### Patch Changes

- [#109](https://github.com/web-fragments/web-fragments/pull/109) [`aa48cb3`](https://github.com/web-fragments/web-fragments/commit/aa48cb30ca934197995d843d937ca66b12e80f95) Thanks [@1000hz](https://github.com/1000hz)! - [gateway] TypeScript no longer throws an error if the deprecated `upstream` property is missing.

## 0.2.0

### Minor Changes

- [#94](https://github.com/web-fragments/web-fragments/pull/94) [`139a6d0`](https://github.com/web-fragments/web-fragments/commit/139a6d0be7785553385864e2ef67cd62a62eba17) Thanks [@anfibiacreativa](https://github.com/anfibiacreativa) and [@IgorMinar](https://github.com/IgorMinar)! - [gateway] BREAKING CHANGE: Fragment registration `FragmentConfig` property `upstream` renamed to `endpoint`.

### Patch Changes

- [#104](https://github.com/web-fragments/web-fragments/pull/104) [`99e7fc2`](https://github.com/web-fragments/web-fragments/commit/99e7fc2d91f7f9b954390f28824667fccbdaf5ce) Thanks [@1000hz](https://github.com/1000hz)! - Cloudflare Pages fragment gateway middleware now streams fragment content from upstream

## 0.1.1

### Patch Changes

- db7c26c: Fixed issue with `additionalHeaders` not being included on soft-navigations to a fragment

## 0.1.0

### Minor Changes

- 982c4f5: [gateway] BREAKING CHANGE: Cloudflare Pages `getMiddleware()` function's second parameter is now an `options` object rather than a single `mode: string`.
- 982c4f5: [gateway] Cloudflare Pages `getMiddleware()` now accepts an `additionalHeaders` option that allows you to include additional headers in the request to the upstream fragment's endpoint.

### Patch Changes

- 41b0f59: [elements] Fixed error during piercing when a fragment contained CSS using the `@import` directive. Fixes [#78](https://github.com/web-fragments/web-fragments/issues/78)
- Updated dependencies [332c98b]
  - reframed@0.1.2

## 0.0.16

### Patch Changes

- 2a2a9a7: Allow an optional property "forwardFragmentHeaders" when registering a fragment in the gateway. When set, forward the specified response headers from the fragment response to the gateway response.

## 0.0.15

### Patch Changes

- Updated dependencies [57365d1]
- Updated dependencies [113ce80]
- Updated dependencies [1a83fca]
- Updated dependencies [5107b6b]
  - reframed@0.1.1

## 0.0.14

### Patch Changes

- 71dfac2: Add fragment-id attribute to fragment-host in order to properly pierce into the fragment-outlet
- 07e8618: [gateway] The `cloudflare-pages` middleware now includes the `fragment-id` on the `<fragment-host>` when server-rendering a fragment
- 07e8618: [elements] `<fragment-host>`s now only pierce into `<fragment-outlet>`s that have a matching `fragment-id`
- 71dfac2: Insert CSS rule in reverse order when constructing a stylesheet during piercing in order to retain CSS specificity
- 07e8618: [elements] `A <fragment-outlet>` now gets pierced by only one `<fragment-host>`
- Updated dependencies [14a68ea]
- Updated dependencies [699b108]
  - reframed@0.1.0

## 0.0.13

### Patch Changes

- Updated dependencies [e128ab9]
- Updated dependencies [e128ab9]
- Updated dependencies [4db9bf4]
- Updated dependencies [4db9bf4]
  - reframed@0.0.13

## 0.0.12

### Patch Changes

- 4f8e5c6: feat(web-fragments) Revert fix for style leakage from inherited css properties"
- 96b66ec: feat: Add a header to signal when fragments are running in embedded mode
- Updated dependencies [7a8f79a]
- Updated dependencies [55ed23e]
- Updated dependencies [7a8f79a]
- Updated dependencies [96b66ec]
  - reframed@0.0.12

## 0.0.11

### Patch Changes

- 39e0f01: Focus and selection state is now preserved when piercing a <fragment-host> into a <fragment-outlet>.
- a19c318: The `<fragment-host>` element is no longer responsible for cleaning up global `reframed` side-effects in its `disconnectedCallback`. These are now cleaned up by `reframed` itself.
- eeb6667: feat: Prevent styling leakage from inherited css properties
- Updated dependencies [a19c318]
- Updated dependencies [a19c318]
- Updated dependencies [9511b7b]
  - reframed@0.0.11

## 0.0.10

### Patch Changes

- Updated dependencies [8d7d522]
  - reframed@0.0.10

## 0.0.9

### Patch Changes

- 05f3fc0: patch main window history to dispatch popstate events for reframed iframes to trigger UI updates. These patches are reverted when the iframe is destroyed
- b74969b: fix: remove unnecessary `qinit` dispatching from `fragment-outlet`
- Updated dependencies [45df910]
- Updated dependencies [af60115]
- Updated dependencies [05f3fc0]
- Updated dependencies [af0e8b2]
  - reframed@0.0.9

## 0.0.8

### Patch Changes

- 91db623: refactor: define cloudflare-pages specific middleware entrypoint instead of exposing `getPagesMiddleware`
- f4bdda0: Add support for overriding response in onSSRFetchError
- 132d6ce: Prevented the FOUC when piercing into fragment-outlet
- 469a67f: Fix global event listeners added by monkeyPatchIframeDocument() not being cleaned up on iframe removal
- Updated dependencies [469a67f]
  - reframed@0.0.8

## 0.0.7

### Patch Changes

- Updated dependencies [de47957]
  - reframed@0.0.7

## 0.0.6

### Patch Changes

- Updated dependencies [1ca6280]
  - reframed@0.0.6
