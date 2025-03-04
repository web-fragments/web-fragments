---
'web-fragments': minor
---

dev: merge the reframed library into the web-fragments package

The standalone reframed package is now deprecated.
Since it's unlikely that anyone used it directly it's unlikely that anyone will be impacted by this change.

Over the course of the development we realized that reframed as a standalone library doesn't make sense.
Reframing and the reframed library requires shadowdom and the gateway and without the rest of web-fragments it provides very little utility.
On the other hand, keeping the library as a separate package creates unnecessary overhead and friction.

For these reasons we decided to keep the library just as an implementation detail of web-fragments.
