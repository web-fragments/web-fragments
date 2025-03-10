---
'web-fragments': patch
---

fix: Document#documentElement, #head, and #body should fall back on the firstChildElement of fragment's shadowRoot

We currently don't guarantee that wf- elements will be present in DOM so we need a fallback in case they are not there.
