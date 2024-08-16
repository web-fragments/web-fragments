---
"reframed": patch
---

Fixed how reframed handles script nodes with empty text content. The reference to the original script node is added to the iframe context and an inert clone is added to the main document. The original script node is then evaluated if text content is added later.
