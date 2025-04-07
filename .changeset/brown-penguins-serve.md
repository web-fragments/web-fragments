---
'web-fragments': patch
---

feat: make it possible to register a fragment endpoint as a fetcher function

Fragments can now be registered using a url or function that matches the standard Fetch API.

This enables more flexibility when connecting to fragment endpoints.
On Cloudflare specifically this means that a gateway can connect to a fragment using a service binding.
