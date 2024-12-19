---
'web-fragments': minor
---

feat: refactor cloudflare middleware to a generic web and node middleware

This enables the Web Fragments gateway to be used in many different contexts, including node.

The node support means express, connect, vite, storybook can now be integrated with web fragments too.

The node implementation simply uses the web implementation that is wrapped into a node-to-web adapter, which ensures feature parity with the web implementation.

Lots of tests were added to ensure the middleware works as expected.

There is a bunch of additional cleanup in this PR that was hard to extract into a separate PR.

BREAKING CHANGE: The cloudflare middleware has been removed. The new middleware is a generic web and node middleware.

To migrate update the existing CF middleware to web middleware:

```js
import { FragmentGateway, getWebMiddleware } from 'web-fragments/gateway';

const gateway = new FragmentGateway({ ... });

const middleware = getWebMiddleware(gateway, { mode: 'development' });

export const onRequest = async (context) => {
	const { request, next } = context;

	return await middleware(request, next)
};
```
