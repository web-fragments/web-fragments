---
'web-fragments': patch
---

fix: speed up web-fragment initialization by caching the reframed iframe document using cache-control headers

We now set Cache-Control headers on the HTTP response that serves the empty iframe document which is needed to correctly initialize window.location in the reframed context.

With these headers we now cache the network response for 1 hour, and afterwards we revalidate the response via stale-while-revalidate strategy: https://web.dev/articles/stale-while-revalidate

This gives us significant performance benefits (shaves off 150-250ms in real world scenarios), while we still retain the ability to change the iframe's content in case a need arises in the future.
