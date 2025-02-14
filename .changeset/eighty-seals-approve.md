---
'web-fragments': minor
---

feat: clean up the web-fragments API surface

BREAKING CHANGES: there are several breaking changes in this change that reshape the API surface of the package. All of them are syntactic and should be easy to absorb.

Notably:

- the `web-fragments/elements` entry point was now simplified to just `web-fragments`
- the `FragmentOutlet` class and `<fragment-outlet>` custom element were renamed to `WebFragment` and `<web-fragment>` respectively
- the `FragmentHost` class and `<fragment-host>` custom element were renamed to `WebFragmentHost` and `<web-fragment-host>` respectively, and more importantly are now considered an implementation detail which app developers shouldn't interact with
- the `register` function was renamed to `initializeWebFragments`

These changes result in the current code that looks like:

```js
import { register, FragmentOutlet } from 'web-fragments/elements';

register();

// imperative use:
const fragment = new FragmentOutlet();
fragment.setAttribute('fragment-id', 'someId');
document.body.appendChild(fragment);

// declarative use:
<fragment-outlet fragment-id="someId"></fragment-outlet>;
```

to now turn into a more easy to follow version:

```js
import { initializeWebFragments, WebFragment } from 'web-fragments';

initializeWebFragments();

// imperative use:
const fragment = new WebFragment();
fragment.setAttribute('fragment-id', 'someId');
document.body.appendChild(fragment);

// declarative use:
<web-fragment fragment-id="someId"></web-fragment>;
```
