---
"web-fragments": patch
---

The `<fragment-host>` element is no longer responsible for cleaning up global `reframed` side-effects in its `disconnectedCallback`. These are now cleaned up by `reframed` itself.
