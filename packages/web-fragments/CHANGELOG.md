# web-fragments

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
