---
'web-fragments': patch
---

fix: fix window.matchMedia to operate on the visible window/document

By default they operate on the iframe, which returns non-sense values.
