# reframed

## 0.1.3

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

## 0.1.2

### Patch Changes

- 332c98b: fix: #83 - only show console logs in dev mode

## 0.1.1

### Patch Changes

- 57365d1: BREAKING CHANGE: Removed `document.unreframedBody` property
- 113ce80: Fixed runtime errors when invoking `document.getElementsBy*()` methods. Fixes [#60](https://github.com/web-fragments/web-fragments/issues/60)
- 1a83fca: Patched global constructors in the reframed context to also compare against their parent context equivalent when performing `instanceof` comparisons. Fixes [#67](https://github.com/web-fragments/web-fragments/issues/67).
- 5107b6b: Document patches are now applied to the `document` instance itself rather than `Document.prototype`. Fixes [#73](https://github.com/web-fragments/web-fragments/issues/73)

## 0.1.0

### Minor Changes

- 699b108: Patched window size getters (`innerHeight`, etc) in the reframed context to read the parent context's equivalent. Fixes [#68](https://github.com/web-fragments/web-fragments/issues/68)

### Patch Changes

- 14a68ea: Custom elements are now created by the reframed document so they use its custom element registry instead of the main window's registry. Refs [#72](https://github.com/web-fragments/web-fragments/issues/72).

## 0.0.13

### Patch Changes

- e128ab9: Now including `PopStateEvent.state` when forwarding `popstate` events from the parent window to a reframed window.
- e128ab9: No longer dispatching an extra `popstate` event on the reframed `window` when a client-side navigation occurs in a reframed context.
- 4db9bf4: Fixed how reframed handles script nodes with empty text content. The reference to the original script node is added to the iframe context and an inert clone is added to the main document. The original script node is then evaluated if text content is added later.
- 4db9bf4: When scripts are executed in reframedContext, we now handle only valid scripts that can be evaluated. Script nodes that are treated as data blocks are added directly to the main document.

## 0.0.12

### Patch Changes

- 7a8f79a: Fixed issue with History API patches causing a recursive loop
- 55ed23e: Fixed incorrect iframe `document.styleSheets` patch. We were previously defining it as `document.stylesheets`.
- 7a8f79a: Refactored how addEventListener / removeEventListener are patched within the iframe environment to properly clean up listeners added to the document.
- 96b66ec: feat: Add a header to signal when fragments are running in embedded mode

## 0.0.11

### Patch Changes

- a19c318: Refactored how event listeners added to the parent execution context are cleaned up. These are now removed automatically when the associated reframed iframe is unloaded.
- a19c318: Refactored how patches to the History API are applied to the parent execution context.
- 9511b7b: Another attempt at fixing DOM insertion method patching.

  Our previous assumptions in [#42](https://github.com/web-fragments/web-fragments/pull/42) turned out to be wrong. We do indeed need to patch the main execution context's insertion methods. We now patch them to check if the node the insertion method is being called on is within a reframed container, and if so execute any potential script elements within the associated reframed context.

## 0.0.10

### Patch Changes

- 8d7d522: Fixed DOM insertion patching issue. We were accidentally patching the main context's prototypes instead of the reframed context prototypes.

## 0.0.9

### Patch Changes

- 45df910: fix: patch the iframe's document `readyState` (and also dispatch `readystatechange` event)
- af60115: fix: patch iframe's window `IntersectionObserver`
- 05f3fc0: patch main window history to dispatch popstate events for reframed iframes to trigger UI updates. These patches are reverted when the iframe is destroyed
- af0e8b2: DOM insertion methods now result in inserted scripts being executed in the reframed context.

## 0.0.8

### Patch Changes

- 469a67f: Fix global event listeners added by monkeyPatchIframeDocument() not being cleaned up on iframe removal

## 0.0.7

### Patch Changes

- de47957: Update `writable-dom` to fix empty inline script tag issue

  See https://github.com/web-fragments/writable-dom/commit/d8c96af41e71448ace4c8387391bc678dce143bd

## 0.0.6

### Patch Changes

- 1ca6280: fix: use iframe document instead of main document as scriptLoadingDocument in writable-dom

  this changeset is relative to the changes introduced in https://github.com/web-fragments/web-fragments/pull/16/commits/2c490e2f5ba3c3ed5dd46d36d748f02bd1fa7878 (https://github.com/web-fragments/web-fragments/pull/16)
