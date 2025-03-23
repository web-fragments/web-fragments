---
'web-fragments': minor
---

feat: add support for piercing fragments into static/SSRed app shell

Previously piercing was only supported when the app shell was client-side rendered.

With this change, fragments are pierced (embedded) into the app shell by the gateway even in the cases when the app shell is static or SSRed html.

On the client side, the pierced fragment is then adopted into the surrounding `<web-fragment>` element without any DOM moves (portaling).

This change not only enables SSRed app shell use-cases, but is also a prerequisite for nesting fragments which is something we'd like to support in the future.

This change required moving around quite a few pieces of code both on the gateway and in the elements.
I cleaned up some of the code along the way, including making most of the web-fragment-host APIs private.
