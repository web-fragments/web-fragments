---
'web-fragments': patch
---

fix: correctly update document.title

Setting document.title should actually update the `<title>` element within the `<head>` of the fragment.

And bound fragments should also update parent's document.title — for bound fragments the title is a shared state, just like window.location and history.
