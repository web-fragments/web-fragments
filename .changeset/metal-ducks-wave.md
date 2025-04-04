---
'web-fragments': patch
---

fix: speed up non-pierced fragment initialization by optimizing iframe creation

Previously, for non-pierced fragments, we'd first fetch the fragment's html and then we'd initialize the iframe used for reframing.
The iframe always needs to make a fetch request to the server, so this would cause a sequence of two waterfall http requests for each fragment slowing down the initialization.

It turns out that it's not necessary to wait, and we can initialize the iframe early on, potentially parallelizing the initialization.

While I was at it, I cleaned up a bunch of stuff in reframed that was no longer relevant.
