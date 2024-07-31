---
"reframed": patch
---

Refactored how event listeners added to the parent execution context are cleaned up. These are now removed automatically when the associated reframed iframe is unloaded.
