---
'web-fragments': patch
---

fix(gateway): disable conditional http requests when fetching a fragment to pierce

When piercing, we always need the fragment to return a response body.

For this reason we must disable conditional http requests when piercing by not relaying if-none-match and if-modified-since headers to the fragment endpoint.

This change also contains a small change to the node adapter, so that it doesn't crash when it encounters a 304 response from the shell.
