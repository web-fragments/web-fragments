---
'web-fragments': patch
---

fix(gateway): strip <!doctype> tags from fragment responses

Nested doctype tags might cause some browsers to complain or choke (e.g. Firefox in some cases).

Browsers don't materialize this tag in the DOM anyway so it should be ok to strip them (if it's nested within other elements).
