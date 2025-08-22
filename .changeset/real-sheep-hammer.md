---
'web-fragments': minor
---

feat(gateway): enable fragments to configure their own Content Security Policy (CSP)

With FragmentConfig#iframeHeaders, fragments can now configure their own Content Security Policy (CSP). See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP

This feature is very useful in enabling fragments to make their CSP more strict or relaxed based without requiring the entire fragment federation to have a single CSP policy.

Important: The CSP configured only applies to the script execution and does not affect the DOM operations. In fragments the script execution is isolated, but DOM is shared by all fragments and the host app. This means that the host app should be configured with a CSP that takes into account the DOM needs of all fragments (e.g. `img-src`), but the script execution and mainly allowing/disallowing `unsafe-eval` can be configured at the fragment level.

Example usage:

```js
fragmentGateway.registerFragment({
	fragmentId: 'my-fragment',
  ...
  iframeHeaders: {
    'Content-Security-Policy': `connect-src 'self'; object-src 'none'; script-src 'self'; base-uri 'self';`,
		...
	},
});
```
