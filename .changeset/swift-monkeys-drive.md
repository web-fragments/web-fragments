---
'web-fragments': minor
---

feat: support soft navigation to fragments with conflicting urls

The web-fragment element now appends `X-Web-Fragment-Id` header to all requests it makes to initiate a fragment.

This header is then used by the gateway to enforce that a fragment match is made only if both the fragment ID and the request url match the information provided in the fragment configuration at registration time.

If two or more fragments match current request's url, the gateway will route the request to the fragment with matching fragment ID.
