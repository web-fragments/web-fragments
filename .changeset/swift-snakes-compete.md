---
'reframed': patch
'web-fragments': patch
---

fix(reframed): support for document.currentScript and improve execution of scripts

All sync scripts (inline and external) can now read the document.currentScript reference.

Internally we map the call to the clone of the script element present in the reframed DOM that maps to the currently executing script in the iframe.

This change also includes improvements to how we append, clone, and execute scripts to virtualize script loading more faithfully.

Tests for these changes are on the pending test-suite branch and will be merged together with it.
