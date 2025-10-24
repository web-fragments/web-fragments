---
'web-fragments': patch
---

fix(gateway): correctly insert shadow root between web-fragment and web-fragment-host during piercing into SSR-ed host

Before this fix, piercing into SSR-ed host would not work because the shadow root was not inserted between the web-fragment and web-fragment-host elements.

This was due to us having two code paths where this logic happens and only the WASM HTMLRewriter implementation was inserting the shadow root.
