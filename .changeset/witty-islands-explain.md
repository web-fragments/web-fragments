---
'web-fragments': patch
---

fix(gateway): automatically follow redirects returned by the fragment endpoint

If the fragment endpoint returns a redirect in response to a fetchFragment call,
the gateway will automatically follow this redirect.
