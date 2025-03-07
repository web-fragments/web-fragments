---
'web-fragments': patch
---

fix: correctly handle hard navigations and reloads from fragments

Previously a hard navigation (`location.href = '/new-url'`) or location reload (`location.reload()`)
within a (bound) fragment would result in this fragment getting into a broken state.

The root cause was that navigation would cause the reframed iframe reloaded,
unloading all JS code but the DOM remained unchanged.

This resulted in broken UX.

With this change any hard navigation or reload within a bound fragment will
be propagated to the main window, causing a hard navigation or reload in the app shell.

It's a bit unclear what should happen when this kind of navigation happens in an unbound fragment.
For this reasons, we only empty the fragment DOM for now and log a warning.
