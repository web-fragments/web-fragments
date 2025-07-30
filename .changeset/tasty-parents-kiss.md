---
'web-fragments': patch
---

fix: throw WebFragmentError when we risk infinite iframe recursion during reframe init

If the fragment gateway was not properly configured (e.g. the routePaths don't contain the main navigable url that starts a fragment), reframed creates an iframe which when loaded by the browser loads the original host html rather than the minimal reframed init html, which then causes a new nested fragment to be created which then repeats the process, resulting in an infinite recursion.

This turns out to be a rather common user error, so to make it easier to diagnose and fix, we now detect it and throw an error.
