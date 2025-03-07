---
'web-fragments': patch
---

fix(reframed): don't create an superfluous browser history record in firefox

In Firefox, an extra history record is created for iframes appended for at least one turn of the event loop (a task), which then have their `src` attribute set.

To prevent bogus history records creation in Firefox, we ensure that reframed iframes are appended only once we set their `src` attribute.
