---
'web-fragments': minor
---

fix(gateway): prefix <html>, <head>, and <body> tags in fragment response as <wf-html>, <wf-head>, and <wf-body>

The gateway now rewrites fragment html so that any <html>, <head>, and <body> tags are replaced with <wf-html>, <wf-head>, and <wf-body> tags.

DOM doesn't allow duplicates of these three elements in the document, and the main document already contains them.

We need to replace these tags, to prevent the DOM from silently dropping them when the content is added to the main document.
