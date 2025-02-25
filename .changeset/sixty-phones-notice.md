---
'reframed': patch
'web-fragments': patch
---

fix(reframed): node.ownerDocument should return fragment Document

Any node within the fragment's shadowRoot should consider its ownerDocument to be the monkey patched Document from the reframed iframe.

If we don't patch this, it's too easy for code to escape the shadowRoot boundary when traversing the DOM.
