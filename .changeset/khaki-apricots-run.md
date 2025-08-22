---
'web-fragments': patch
---

fix(web-fragments): handle iframe errors due to x-frame-options=deny header more gracefully

We now detect this scenario and show a helpful error in the console.
