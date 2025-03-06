---
'web-fragments': patch
---

fix: web-fragment element now uses shadowRoot to contain web-fragment-host

This is mainly to create a better abstraction and remove some noise from the DOM tree.

This does mean having two nested shadowRoots per fragment, but the overhead of these is insignificant.
