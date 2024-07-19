# reframed

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
