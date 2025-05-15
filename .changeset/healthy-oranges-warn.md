---
'web-fragments': patch
---

fix(gateway): don't modify fragment request headers

The request might be immutable in some environments.
