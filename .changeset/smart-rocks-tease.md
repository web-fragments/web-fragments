---
"reframed": patch
---

Another attempt at fixing DOM insertion method patching.

Our previous assumptions in [#42](https://github.com/web-fragments/web-fragments/pull/42) turned out to be wrong. We do indeed need to patch the main execution context's insertion methods. We now patch them to check if the node the insertion method is being called on is within a reframed container, and if so execute any potential script elements within the associated reframed context. Note that loading `reframed` is now side-effectful.
