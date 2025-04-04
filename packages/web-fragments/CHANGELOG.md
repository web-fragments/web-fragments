# web-fragments

## 0.5.0

### Minor Changes

- [#181](https://github.com/web-fragments/web-fragments/pull/181) [`0bf2dd1`](https://github.com/web-fragments/web-fragments/commit/0bf2dd13eac50f761157dabf250d2e93c0f040bc) Thanks [@IgorMinar](https://github.com/IgorMinar)! - feat: add support for piercing fragments into static/SSRed app shell

  Previously piercing was only supported when the app shell was client-side rendered.

  With this change, fragments are pierced (embedded) into the app shell by the gateway even in the cases when the app shell is static or SSRed html.

  On the client side, the pierced fragment is then adopted into the surrounding `<web-fragment>` element without any DOM moves (portaling).

  This change not only enables SSRed app shell use-cases, but is also a prerequisite for nesting fragments which is something we'd like to support in the future.

  This change required moving around quite a few pieces of code both on the gateway and in the elements.
  I cleaned up some of the code along the way, including making most of the web-fragment-host APIs private.

### Patch Changes

- [#187](https://github.com/web-fragments/web-fragments/pull/187) [`889b501`](https://github.com/web-fragments/web-fragments/commit/889b5013b135bf0c6717dea9b5bb9f8f7913e627) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix: speed up web-fragment initialization by caching the reframed iframe document using cache-control headers

  We now set Cache-Control headers on the HTTP response that serves the empty iframe document which is needed to correctly initialize window.location in the reframed context.

  With these headers we now cache the network response for 1 hour, and afterwards we revalidate the response via stale-while-revalidate strategy: https://web.dev/articles/stale-while-revalidate

  This gives us significant performance benefits (shaves off 150-250ms in real world scenarios), while we still retain the ability to change the iframe's content in case a need arises in the future.

- [#187](https://github.com/web-fragments/web-fragments/pull/187) [`0fd7294`](https://github.com/web-fragments/web-fragments/commit/0fd72944bb8bbcf9c6e1caee2a45602b42025fa7) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix: speed up non-pierced fragment initialization by optimizing iframe creation

  Previously, for non-pierced fragments, we'd first fetch the fragment's html and then we'd initialize the iframe used for reframing.
  The iframe always needs to make a fetch request to the server, so this would cause a sequence of two waterfall http requests for each fragment slowing down the initialization.

  It turns out that it's not necessary to wait, and we can initialize the iframe early on, potentially parallelizing the initialization.

  While I was at it, I cleaned up a bunch of stuff in reframed that was no longer relevant.

- [#187](https://github.com/web-fragments/web-fragments/pull/187) [`0d623ff`](https://github.com/web-fragments/web-fragments/commit/0d623ff797cfc1691e727d8a7ead93c173945ca1) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix: fire onload event without the 2s delay

  Previously we fired the window.onload even in the reframed context after a 2 second delay.
  This delay was arbitrary, and only slowed down SPAs or simple SSRed rendered apps.
  The delay was removed in favor of setTimeout without a delay.

  Eventually we'd like to fire this even correctly when all subresources load.
  Some more research is needed on how to do that efficiently and reliably.

- [#181](https://github.com/web-fragments/web-fragments/pull/181) [`c642347`](https://github.com/web-fragments/web-fragments/commit/c6423479636f6b601d42f92a3a9d55764d59d078) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(web-fragment): support DOMContentLoaded and load events

- [#181](https://github.com/web-fragments/web-fragments/pull/181) [`4c4f1b7`](https://github.com/web-fragments/web-fragments/commit/4c4f1b7fc486cafa70c847927ecc3a69cf823a1f) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(web-fragment): make pierced fragment's iframe consistent with fetched fragment

  When a fragment is pierced rather than fetched during soft navigation, it should behave exactly the same.

  With this fix the iframe's name is prefixed with "wf:" and the iframe#src is relative.

  The tests for these changes are in the next commit which tests pierced and non-pierced fragments on CI.

## 0.4.6

### Patch Changes

- [#183](https://github.com/web-fragments/web-fragments/pull/183) [`bbd8506`](https://github.com/web-fragments/web-fragments/commit/bbd850635f6b2e4bb987549da0525bc94742ec97) Thanks [@rnguyen17](https://github.com/rnguyen17)! - add support for search params pattern matching in the gateway

- [#183](https://github.com/web-fragments/web-fragments/pull/183) [`5e56bd8`](https://github.com/web-fragments/web-fragments/commit/5e56bd858d1bede52f1273fc12a096f56ca09683) Thanks [@rnguyen17](https://github.com/rnguyen17)! - fix regression in prepareUnattachedInlineScript() in reframed.ts where empty scripts were not being added to the iframe

## 0.4.5

### Patch Changes

- [#172](https://github.com/web-fragments/web-fragments/pull/172) [`957c06a`](https://github.com/web-fragments/web-fragments/commit/957c06ab2fe4faf4570f3edf517574654bf25435) Thanks [@anfibiacreativa](https://github.com/anfibiacreativa)! - feat: replace prePiercingStyles and prePiercingClassNames with ¨piercing¨ prefix

  These APIs were originally misnamed, so this change corrects it.

  Piercing is the process of inserting a fragment into the initial payload, and there isn´t such thing as "prepiercing" stage in the fragment´s lifecycle.

  The change was made a backwards compatible way.

- [#182](https://github.com/web-fragments/web-fragments/pull/182) [`177a53a`](https://github.com/web-fragments/web-fragments/commit/177a53a692824bcb2d63b6ba2cdd88611f29aebc) Thanks [@rnguyen17](https://github.com/rnguyen17)! - Fix inert scripts being incorrectly evaluated multiple times on DOM insertion

## 0.4.4

### Patch Changes

- [#168](https://github.com/web-fragments/web-fragments/pull/168) [`4310b73`](https://github.com/web-fragments/web-fragments/commit/4310b735584e3e738b12c8c2fdd74b98459af048) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix: make writabledom a npm devDependency rather than dependency

  We bundle it in, so there is no need to have it installed by the clients.

  This resolves issues with installations that struggled with the github: protocol we use with this dep.

- [#168](https://github.com/web-fragments/web-fragments/pull/168) [`6af4011`](https://github.com/web-fragments/web-fragments/commit/6af40111c39bfba3079d7776fd2fde9843723330) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix: correctly report clientWidth and clientHeight on document.documentElement

  We previously reported 0 because the wf-\* elements don't have width.

  Now we proxy to the main document to get the document (and body) width and height.

## 0.4.3

### Patch Changes

- [#165](https://github.com/web-fragments/web-fragments/pull/165) [`d4a7b58`](https://github.com/web-fragments/web-fragments/commit/d4a7b58669301ba2bef87b592be2ad2b457475e2) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(gateway): strip <!doctype> tags from fragment responses

  Nested doctype tags might cause some browsers to complain or choke (e.g. Firefox in some cases).

  Browsers don't materialize this tag in the DOM anyway so it should be ok to strip them (if it's nested within other elements).

## 0.4.2

### Patch Changes

- [#164](https://github.com/web-fragments/web-fragments/pull/164) [`868eb94`](https://github.com/web-fragments/web-fragments/commit/868eb94bceb808e7c43f2908b1ecec3f96f8a9f3) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(gateway): disable conditional http requests when fetching a fragment to pierce

  When piercing, we always need the fragment to return a response body.

  For this reason we must disable conditional http requests when piercing by not relaying if-none-match and if-modified-since headers to the fragment endpoint.

  This change also contains a small change to the node adapter, so that it doesn't crash when it encounters a 304 response from the shell.

- [#163](https://github.com/web-fragments/web-fragments/pull/163) [`9f81559`](https://github.com/web-fragments/web-fragments/commit/9f815591aba39623131dc99b49827b428e2eb0a4) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix: Document#documentElement, #head, and #body should fall back on the firstChildElement of fragment's shadowRoot

  We currently don't guarantee that wf- elements will be present in DOM so we need a fallback in case they are not there.

- [#136](https://github.com/web-fragments/web-fragments/pull/136) [`6c2d0ee`](https://github.com/web-fragments/web-fragments/commit/6c2d0ee7283e4615c693546981ecb50e54624a29) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix: improve support for document.currentScript and execution of scripts

  All non-module scripts (inline and external) can now read the document.currentScript reference.

  Internally we map the call to from the executing script's element to it's inert source element present in the reframed DOM.

  This change also includes improvements to how we append, clone, and execute scripts to virtualize script loading more faithfully.

- [#136](https://github.com/web-fragments/web-fragments/pull/136) [`34f9644`](https://github.com/web-fragments/web-fragments/commit/34f9644a2124be728934d9f7c0064a9e226ff2d6) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix: improve Node#getRootNode() and Node#ownerDocument compatibility

  Small changes to be html spec compliant.

  I also added tests to cover all the cases.

## 0.4.1

### Patch Changes

- [#159](https://github.com/web-fragments/web-fragments/pull/159) [`e05bcb6`](https://github.com/web-fragments/web-fragments/commit/e05bcb6ca33ee5374d0f4dad099f910d81a6e627) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix: correctly handle hard navigations and reloads from fragments

  Previously a hard navigation (`location.href = '/new-url'`) or location reload (`location.reload()`)
  within a (bound) fragment would result in this fragment getting into a broken state.

  The root cause was that navigation would cause the reframed iframe reloaded,
  unloading all JS code but the DOM remained unchanged.

  This resulted in broken UX.

  With this change any hard navigation or reload within a bound fragment will
  be propagated to the main window, causing a hard navigation or reload in the app shell.

  It's a bit unclear what should happen when this kind of navigation happens in an unbound fragment.
  For this reasons, we only empty the fragment DOM for now and log a warning.

## 0.4.0

### Minor Changes

- [#148](https://github.com/web-fragments/web-fragments/pull/148) [`f68f01d`](https://github.com/web-fragments/web-fragments/commit/f68f01d5e3b119f17e422374e29d24c3fc64c365) Thanks [@IgorMinar](https://github.com/IgorMinar)! - feat: clean up the web-fragments API surface

  BREAKING CHANGES: there are several breaking changes in this change that reshape the API surface of the package. All of them are syntactic and should be easy to absorb.

  Notably:

  - the `web-fragments/elements` entry point was now simplified to just `web-fragments`
  - the `FragmentOutlet` class and `<fragment-outlet>` custom element were renamed to `WebFragment` and `<web-fragment>` respectively
  - the `FragmentHost` class and `<fragment-host>` custom element were renamed to `WebFragmentHost` and `<web-fragment-host>` respectively, and more importantly are now considered an implementation detail which app developers shouldn't interact with
  - the `register` function was renamed to `initializeWebFragments`

  These changes result in the current code that looks like:

  ```js
  import { register, FragmentOutlet } from 'web-fragments/elements';

  register();

  // imperative use:
  const fragment = new FragmentOutlet();
  fragment.setAttribute('fragment-id', 'someId');
  document.body.appendChild(fragment);

  // declarative use:
  <fragment-outlet fragment-id="someId"></fragment-outlet>;
  ```

  to now turn into a more easy to follow version:

  ```js
  import { initializeWebFragments, WebFragment } from 'web-fragments';

  initializeWebFragments();

  // imperative use:
  const fragment = new WebFragment();
  fragment.setAttribute('fragment-id', 'someId');
  document.body.appendChild(fragment);

  // declarative use:
  <web-fragment fragment-id="someId"></web-fragment>;
  ```

- [#139](https://github.com/web-fragments/web-fragments/pull/139) [`816e88b`](https://github.com/web-fragments/web-fragments/commit/816e88b187d91e76032dc3c7d015a971810708d9) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(gateway): prefix <html>, <head>, and <body> tags in fragment response as <wf-html>, <wf-head>, and <wf-body>

  The gateway now rewrites fragment html so that any <html>, <head>, and <body> tags are replaced with <wf-html>, <wf-head>, and <wf-body> tags.

  DOM doesn't allow duplicates of these three elements in the document, and the main document already contains them.

  We need to replace these tags, to prevent the DOM from silently dropping them when the content is added to the main document.

- [#142](https://github.com/web-fragments/web-fragments/pull/142) [`973a8d8`](https://github.com/web-fragments/web-fragments/commit/973a8d851bcfaebd784d0b8cbb98892233be84e7) Thanks [@IgorMinar](https://github.com/IgorMinar)! - feat(web-fragments): all fragments have css style display:block and position:relative set on the host

  Since fragments usually contain other block elements they should be rendered as block rather than inline.

- [#145](https://github.com/web-fragments/web-fragments/pull/145) [`75b1714`](https://github.com/web-fragments/web-fragments/commit/75b1714d68b4374129c89dc0544876b800cea49c) Thanks [@IgorMinar](https://github.com/IgorMinar)! - dev: merge the reframed library into the web-fragments package

  The standalone reframed package is now deprecated.
  Since it's unlikely that anyone used it directly it's unlikely that anyone will be impacted by this change.

  Over the course of the development we realized that reframed as a standalone library doesn't make sense.
  Reframing and the reframed library requires shadowdom and the gateway and without the rest of web-fragments it provides very little utility.
  On the other hand, keeping the library as a separate package creates unnecessary overhead and friction.

  For these reasons we decided to keep the library just as an implementation detail of web-fragments.

- [#142](https://github.com/web-fragments/web-fragments/pull/142) [`0cfd504`](https://github.com/web-fragments/web-fragments/commit/0cfd50415f33200e867955eedaed2c160074ee9b) Thanks [@IgorMinar](https://github.com/IgorMinar)! - feat(gateway): make it possible for fragments to opt out of piercing

  Occasionally fragments might want to be initialized only from the client.

  FragmentConfig now makes it possible to opt-out of piercing via `piercing: false`:

  ```ts
  fragmentGateway.registerFragment({
    fragmentId: fragmentId,
    piercing: false,
    routePatterns: [`/.../:_*`],
    endpoint: '...'
    prePiercingClassNames: ['...'],
  });
  ```

### Patch Changes

- [#142](https://github.com/web-fragments/web-fragments/pull/142) [`7683f43`](https://github.com/web-fragments/web-fragments/commit/7683f43f6faf7822b4f6127de18a18f776ffa46e) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(gateway): Node middleware adapter handles resp.end() correctly

  The Node middleware adapter now correctly handles the cases where the response
  is flushed with resp.end() without prior calls to resp.writeHead().

  This bug was impacting Vite which uses the following pattern:

  ```js
  res.statusCode = 200;
  res.end(content);
  ```

- [#154](https://github.com/web-fragments/web-fragments/pull/154) [`fc3a287`](https://github.com/web-fragments/web-fragments/commit/fc3a2878439a507e924cbc5c81dc002a1658a603) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix: web-fragment element now uses shadowRoot to contain web-fragment-host

  This is mainly to create a better abstraction and remove some noise from the DOM tree.

  This does mean having two nested shadowRoots per fragment, but the overhead of these is insignificant.

- [#151](https://github.com/web-fragments/web-fragments/pull/151) [`08ba8db`](https://github.com/web-fragments/web-fragments/commit/08ba8dbd4d478adac036602a9f0cc3eda52a48e3) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(gateway): make gateway compatible with node 20

  This is mainly to make it easier to use the gateway in wider range of environments.

- [#142](https://github.com/web-fragments/web-fragments/pull/142) [`fed5c71`](https://github.com/web-fragments/web-fragments/commit/fed5c71141fbe64cab87c053d6f1969ae171a8d6) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix(reframed): don't create an superfluous browser history record in firefox

  In Firefox, an extra history record is created for iframes appended for at least one turn of the event loop (a task), which then have their `src` attribute set.

  To prevent bogus history records creation in Firefox, we ensure that reframed iframes are appended only once we set their `src` attribute.

- [#150](https://github.com/web-fragments/web-fragments/pull/150) [`b4b99bb`](https://github.com/web-fragments/web-fragments/commit/b4b99bb3b8aea446e7da5bd48fc5783d10b54069) Thanks [@IgorMinar](https://github.com/IgorMinar)! - feat: add support for unbound fragments

  Unbound fragments are fragments that don't have their location, history, navigation, and routing bound to the shell application.

  This means that unbound fragments have independent history and navigation that is not represented in browsers address bar, and is not navigable via back and forward buttons/gestures.

  This kind of fragments are useful for auxiliary UI fragments that might have a complex inner state and routing but this state is ephemeral and doesn't need to be preserved during hard reloads.

  Good examples of these use-cases are chat bots, various side panels, assistants, etc.

- [#146](https://github.com/web-fragments/web-fragments/pull/146) [`3dc6469`](https://github.com/web-fragments/web-fragments/commit/3dc6469b388e44b4f18f064d9f1e51030f232efa) Thanks [@rnguyen17](https://github.com/rnguyen17)! - Because the main document can only have one html, head, and body element on the page, the browser will omit extra instances of those elements within the shadowRoot.

  Instead, a valid Document structure within the shadowRoot is provided via "fake" custom container elements injected by the gateway: wf-html, wf-head, and wf-body

  Application code that targets document.documentElement, document.body, and document.head should reference these custom container elements.

  Any CSS selectors used in document.querySelector and document.querySelectorAll are rewritten to selectively target these custom container elements as well.

  For example, `document.querySelector('html body.head')` will be rewritten to `document.querySelector('wf-html wf-body.head)`.

- [#154](https://github.com/web-fragments/web-fragments/pull/154) [`5999948`](https://github.com/web-fragments/web-fragments/commit/5999948ad98cd601213545646bee3609e3471b4a) Thanks [@IgorMinar](https://github.com/IgorMinar)! - fix: fragment's iframe now use fragment-id as its name

  This makes it easy to identify which fragment belongs to which web-fragment.

  Additionally, this also makes it easier to identify the JS context in chrome devtools.

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
