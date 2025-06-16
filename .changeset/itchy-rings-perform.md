---
'web-fragments': patch
---

feat: add support for preload/prefetch/modulepreload links in web fragments

These links need to execute in the reframed fragment context (iframe) and not in the main context, similar to how scripts execute.

Without this fix, browsers might warn that preloaded scripts were not utilized by the application.
This is because browsers don't understand that the scripts were actually executed in fragment's iframe.
