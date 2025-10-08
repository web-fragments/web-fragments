---
'web-fragments': patch
---

fix(gateway): pass any fragment redirect responses to the client

If a fragment returns a redirect response, the gateway should not follow this redirect, but instead should pass the redirect to the client, which can then decide to follow it.

Previously the gateway would follow redirects returned by the fragment endpoint, which was not always safe, because it could result in situations the client was expected to receive the redirect and update window.location before making a new request to the server.

If the gateway auto-follows redirects, the client will not be aware of them, and window.location will not get updated, resulting in the server assuming that the client performed a redirect when it hasn't.

In the real world, this then results in hydration errors because the client and server get out of sync when it comes to the current URL.

Additionally, if the gateway is composing streams during a pierced request, and the fragment endpoint returns a redirect, we must not follow the redirect and instead write a fragment init error into the composed stream because as mentioned above, the fragment client would get out of sync with the fragment server

This change essentially reverts 6a8846a5759e72b7eb5854b63209f9a4d8f35005, which was made with good intentions but failed the test of time and real world usage.
