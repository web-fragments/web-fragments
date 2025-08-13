---
'web-fragments': patch
---

fix: move the default WF styles into an injected inline style sheet

Instead of using a constructed style sheet, we now inject the styles into the response as an inline style sheet.

This prevents FOUC during bootstrap and also simplifies the code.
