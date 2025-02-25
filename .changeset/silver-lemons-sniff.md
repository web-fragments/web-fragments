---
'reframed': patch
'web-fragments': patch
---

fix(reframed): document.activeElement should always point to shadowRoot.activeElement

Previously before we used shadowRoot in web fragments the active element in the fragment targeted main document's active element.
But now that we require the use of shadowRoot, we must use shadowRoot.activeElement instead because otherwise activeElement is set to the element that owns the fragment's shadowroot.
This issue caused the code in fragment to escape the shadowroot, which results in weird bugs.
