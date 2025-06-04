---
'web-fragments': patch
---

fix: don't blow up on unknown elements during event retargeting

We noticed that for example view transition pseudo elements can trigger
a mapping error, which currently throws as a safeguard, but this prevents apps from working.
So until we figure out how to handle this properly we now just warn rather than throw.
