---
'web-fragments': minor
---

feat(gateway): add FragmentConfig#iframeHeaders support for configuring iframe headers

The fragment config can now optionally include `iframeHeaders` key that can contain a `Record<string, string>` of header names and their values.

This feature is useful to configure response headers for requests that come from initialization of the reframed iframe which powers the configured Web Fragment.

For example, you could use this header to configure CSP policy for the iframe, or override any of the default headers set by the Web Fragments gateway.

Example usage:

```js
fragmentGateway.registerFragment({
	fragmentId: 'my-fragment',
  ...
  iframeHeaders: {
		'Some-Header': 'my value',
		'another-header': 'my other value',
	},
});
```
