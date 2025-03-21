---
'web-fragments': patch
---

fix(web-fragment): make pierced fragment's iframe consistent with fetched fragment

When a fragment is pierced rather than fetched during soft navigation, it should behave exactly the same.

With this fix the iframe's name is prefixed with "wf:" and the iframe#src is relative.

The tests for these changes are in the next commit which tests pierced and non-pierced fragments on CI.
