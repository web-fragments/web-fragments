---
'web-fragments': patch
---

feat: replace prePiercingStyles and prePiercingClassNames with ¨piercing¨ prefix

These APIs were originally misnamed, so this change corrects it.

Piercing is the process of inserting a fragment into the initial payload, and there isn´t such thing as "prepiercing" stage in the fragment´s lifecycle.

The change was made a backwards compatible way.
