---
'web-fragments': patch
---

fix(gateway): preserve response headers for soft nav and asset coming from a fragment endpoint

Previously we mistakingly stripped them and returned a response with minimalistic response head and original body, which resulted in many useful headers missing.
Most importantly this issue resulted in caching headers not being correctly relayed to the client.
