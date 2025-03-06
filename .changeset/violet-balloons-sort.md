---
'web-fragments': patch
---

fix: fragment's iframe now use fragment-id as its name

This makes it easy to identify which fragment belongs to which web-fragment.

Additionally, this also makes it easier to identify the JS context in chrome devtools.
