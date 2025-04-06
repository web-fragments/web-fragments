---
'web-fragments': patch
---

fix: window.load event should be fired after all resources, mainly images load

Previously we thought that it would be a bit messy to wait for all images to load, but it turns out to be quite simple, and that's what this change implements.

As for other resource types, we don't need to worry about scripts and styles as those have loaded already.

It's possible that there are some other resource types we should wait for, and we can add support for those as we discover them causing issues.

Fixes #36
