---
"reframed": patch
---

When scripts are executed in reframedContext, we now handle only valid scripts that can be evaluated. Script nodes that are treated as data blocks are added directly to the main document.
