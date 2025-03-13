---
'web-fragments': patch
---

fix: make writabledom a npm devDependency rather than dependency

We bundle it in, so there is no need to have it installed by the clients.

This resolves issues with installations that struggled with the github: protocol we use with this dep.
