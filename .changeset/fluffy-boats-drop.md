---
"web-fragments": patch
"reframed": patch
---

patch main window history to dispatch popstate events for reframed iframes to trigger UI updates. These patches are reverted when the iframe is destroyed
