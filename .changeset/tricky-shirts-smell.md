---
'web-fragments': patch
---

fix: correctly report clientWidth and clientHeight on document.documentElement

We previously reported 0 because the wf-\* elements don't have width.

Now we proxy to the main document to get the document (and body) width and height.
