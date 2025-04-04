---
'web-fragments': patch
---

fix: fire onload event without the 2s delay

Previously we fired the window.onload even in the reframed context after a 2 second delay.
This delay was arbitrary, and only slowed down SPAs or simple SSRed rendered apps.
The delay was removed in favor of setTimeout without a delay.

Eventually we'd like to fire this even correctly when all subresources load.
Some more research is needed on how to do that efficiently and reliably.
