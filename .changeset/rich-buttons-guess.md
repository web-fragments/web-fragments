---
'reframed': patch
'web-fragments': patch
---

Correctly support MutationObserver and ResizeObserver within fragments.

Previously we didn't patch these, and since they were asked to observe DOM from the main frame
the observers didn't work correctly.
