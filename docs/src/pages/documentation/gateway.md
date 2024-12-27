---
title: 'Gateway'
layout: '~/layouts/MarkdownLayout.astro'
---

_Last updated_: December 8, 2024

## What is the Fragments Gateway

The fragments gateway is responsible for the registration of fragments in the application and for intercepting all application requests to match the pathname with a fragment, using a regular expression pattern as defined in the `routePatterns` property.

## Gateway usage

To register fragments, the gateway must be imported to the server application, and instantiated, with the corresponding `fragment` configuration.

```javascript
const gateway = new FragmentGateway(config: FragmentGatewayConfig);
```

## Fragment Gatway API reference

| Member                                                   | Type      | Description                                                                                                                                                                          |
| -------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fragmentConfigs`                                        | (private) | Internal storage for fragment configurations.                                                                                                                                        |
| `routeMap`                                               | (private) | Internal mapping of routes for fragment handling.                                                                                                                                    |
| `prePiercingStyles`                                      | `string`  | Returns a string representing styles applied before piercing fragments.                                                                                                              |
| `registerFragment(fragmentConfig: FragmentConfig): void` | Method    | Registers a fragment in the gateway worker for integration with the gateway worker. <br/> **Parameters:** <ul><li>`fragmentConfig`: Configuration object for the fragment.</li></ul> |
| `matchRequestToFragment(urlOrRequest: string \| URL \| Request): FragmentConfig \| null` | Method | Matches an incoming request to a fragment configuration. <br/> **Parameters:** <ul><li>`urlOrRequest`: The URL or request to match against registered fragments.</li></ul> **Returns:** The matched `FragmentConfig` or `null` if no match is found. |

### Optional gateway configuration object

A `fragment gatway` configuration object can define the cofiguration for `prePiercingStyles`:

```javascript
type FragmentGatewayConfig = {
    prePiercingStyles?: string;
};
```

Once the gateway is instantiated, for example like this

```javascript
// Gateway instantiation
// Pre-piercing styles are only necessary for eager-rendering or piercing, to make sure the fragment
// is placed in the right position and there is no content-layout-shift, once the legacy
// application is bootstrapped
const gateway = new FragmentGateway({
	prePiercingStyles: `<style id="fragment-piercing-styles" type="text/css">
      fragment-host[data-piercing="true"] {
        position: absolute;
        z-index: 1;
      }
    </style>`,
});
```

fragments can be registered, using the `registerFragment` method, that accepts a configuration object.

## Fragment configuration object and API reference

| Property                  | Type                                           | Description                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fragmentId`              | `string`                                       | Unique Id for the fragment.                                                                                                                                                                                                                                                                                                                 |
| `fragmentSrc`             | `string`                                       | Route URL. Describes the location of the fragment in the original application, as defined by the router in place.                                                                                                                                                                                                                           |
| `prePiercingClassNames`   | `string[]`                                     | Styles to apply to the fragment before it gets pierced. Their purpose is to style the fragment to look as close as possible to the final pierced view, ensuring the piercing operation appears seamless. For best results, use the following selector: `:not(piercing-fragment-outlet) > piercing-fragment-host[fragment-id="fragmentId"]`. |
| `routePatterns`           | `string[]`                                     | An array of route patterns this fragment should handle serving. Pattern format must adhere to [path-to-regexp](https://github.com/pillarjs/path-to-regexp#parameters) syntax.                                                                                                                                                               |
| `upstream`                | `string`                                       | The upstream URI of the fragment application. This will be fetched for any request paths matching the specified `routePatterns`.                                                                                                                                                                                                            |
| `forwardFragmentHeaders?` | `string[]`                                     | An optional list of fragment response headers to forward to the gateway response.                                                                                                                                                                                                                                                           |
| `onSsrFetchError?`        | `(req: RequestInfo, failedResOrError: Response \| unknown) => SSRFetchErrorResponse \| Promise<SSRFetchErrorResponse>` | A handler or fallback to apply when the fetch for a fragment SSR code fails. It allows the gateway to serve a fallback response instead of an error response from the server. <br/> **Parameters:** <ul><li>`req`: The request sent to the fragment.</li><li>`failedResOrError`: The failed response (4xx/5xx status) or the thrown error.</li></ul> **Returns:** The response to use for the document's SSR. |

### Example of a fragment registration for a remote Qwik application

A Qwik application fragment hosted remotely and being fetched, can be registered like this

```javascript
gateway.registerFragment({
	fragmentId: 'qwik',
	prePiercingClassNames: ['qwik'],
	routePatterns: ['/qwik-page/:_*', '/_fragment/qwik/:_*', '/ecommerce-page/:_*'],
	upstream: 'http://localhost:4173',
	onSsrFetchError: () => ({
		response: new Response(
			`<p id="qwik-fragment-not-found">
         <style>#qwik-fragment-not-found { color: red; font-size: 2rem; }</style>
         Qwik fragment not found
       </p>`,
			{ headers: [['content-type', 'text/html']] }
		),
	}),
});
```

## Pre-requirements and conventions

Please note that at this time, the following apply, for the fragment to be correctly fetched

- the `routePatterns` array should include the `pathName` in the request in the [shell application](../architecture/architecture#application-shell). For example, to fetch a fragment for which the `<fragment-outlet>`, was placed in the URL `https://myshellapp.com/shop`, `/shop/:_*` must be added to `routePatterns` when registering the fragment. This is so the server knows to intercept the request and process with the [middleware](./middleware) in place

- we recommend to namespace the assets distribution in a folder called `_fragment`. The resulting `path` should be part of the `routePatterns` configuration

- for fragments that are pulling a specific route in the [upstream application](../architecture/architecture#remote-upstream), the `<fragment-outlet>` `src` attribute must be that `route` value

Head to the [middleware](./middleware) documentation, to learn more about intercepting a request and manipulating the response streams.

--------------
#### Authors
<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
<ul>