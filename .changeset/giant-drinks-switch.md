---
'web-fragments': patch
---

fix(gateway): workaround miniflare issue with decompressing zstd responses

Works around https://github.com/cloudflare/workers-sdk/issues/9522
