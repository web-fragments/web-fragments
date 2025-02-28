---
'web-fragments': patch
---

fix: improve support for document.currentScript and execution of scripts

All non-module scripts (inline and external) can now read the document.currentScript reference.

Internally we map the call to from the executing script's element to it's inert source element present in the reframed DOM.

This change also includes improvements to how we append, clone, and execute scripts to virtualize script loading more faithfully.
