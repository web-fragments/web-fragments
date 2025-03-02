---
'web-fragments': minor
---

feat(gateway): make it possible for fragments to opt out of piercing

Occasionally fragments might want to be initialized only from the client.

FragmentConfig now makes it possible to opt-out of piercing via `piercing: false`:

```ts
fragmentGateway.registerFragment({
  fragmentId: fragmentId,
  piercing: false,
  routePatterns: [`/.../:_*`],
  endpoint: '...'
  prePiercingClassNames: ['...'],
});
```
