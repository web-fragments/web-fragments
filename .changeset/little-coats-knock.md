---
"reframed": patch
---

Fixed DOM insertion patching issue. We were accidentally patching the main context's prototypes instead of the reframed context prototypes.
