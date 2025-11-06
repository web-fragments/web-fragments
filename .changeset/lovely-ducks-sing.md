---
'web-fragments': patch
---

fix(client): improve pierced preserveStyle resiliency

In more complex applications, especially those relying on constructed stylesheets, it was possible to for CSS stylesheets to get corrupted during the portaling operation (when pierced fragment is being moved into the newly constructed CSR-ed DOM of the host application).

This change makes the portaling operation much more resilient and avoids most of the problems.

Interestingly, we now do employ the atomic DOM move API (`moveBefore`), which falls a bit short for our needs as it causes the styles to be reloaded during the move operation. This change works around that shortcoming.

This change also introduces better support for adoptedStylesheets and CSS stylesheets in general.
