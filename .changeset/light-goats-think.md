---
"reframed": patch
---

Patched global constructors in the reframed context to also compare against their parent context equivalent when performing `instanceof` comparisons. Fixes [#67](https://github.com/web-fragments/web-fragments/issues/67).
