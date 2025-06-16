---
'web-fragments': patch
---

fix(gateway): workaround miniflare issue impacting compresed responses to subreqeusts

Workaround for https://github.com/cloudflare/workers-sdk/issues/8004 which impacts only dev mode with miniflare.
