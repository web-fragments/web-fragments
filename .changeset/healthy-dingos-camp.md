---
'web-fragments': patch
---

fix: correctly dispatch window.dispatchEvent on in the reframed context

Since we register any window listeners onto the reframed shadowRoot, we also need to monkey patch the dispatchEvent method on the iframe window to dispatch events on the shadowRoot instead of the iframe window.
