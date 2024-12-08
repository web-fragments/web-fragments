---
title: 'Web Fragments full API reference'
layout: '~/layouts/MarkdownLayout.astro'
---

_Last updated_: December 8, 2024

# Full API Reference

## Fragment Gatway API reference

For usage go to the [gateway](../documentation/gateway) document.


| Member                          | Type                                              | Description                                                                                                                                                                                                                                                |
|---------------------------------|---------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `#private`                      | (private)                                         | Internal private property (implementation details are hidden).                                                                                                                                                                                             |
| `fragmentConfigs`               | (private)                                         | Internal storage for fragment configurations.                                                                                                                                                                                                              |
| `routeMap`                      | (private)                                         | Internal mapping of routes for fragment handling.                                                                                                                                                                                                          |
| **Constructor**                 | `constructor(config?: FragmentGatewayConfig)`    | Initializes a new instance of the `FragmentGateway` class. Accepts an optional configuration object (`FragmentGatewayConfig`).                                                                                                                             |
| `prePiercingStyles`             | `string`                                         | Returns a string representing styles applied before piercing fragments.                                                                                                                                                                                    |
| `registerFragment(fragmentConfig: FragmentConfig): void` | Method                                             | Registers a fragment in the gateway worker for integration with the gateway worker. <br/> **Parameters:** <ul><li>`fragmentConfig`: Configuration object for the fragment.</li></ul>                                                                       |
| `matchRequestToFragment(urlOrRequest: string | URL | Request): FragmentConfig | null` | Method                                             | Matches an incoming request to a fragment configuration. <br/> **Parameters:** <ul><li>`urlOrRequest`: The URL or request to match against registered fragments.</li></ul> **Returns:** The matched `FragmentConfig` or `null` if no match is found.       |

## Fragment configuration object and API reference


| Property               | Type                                                                                              | Description                                                                                                                                                                                                                                                                                                                                         |
|------------------------|---------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `fragmentId`          | `string`                                                                                        | Unique Id for the fragment.                                                                                                                                                                                                                                                                                                                        |
| `prePiercingClassNames` | `string[]`                                                                                      | Styles to apply to the fragment before it gets pierced. Their purpose is to style the fragment to look as close as possible to the final pierced view, ensuring the piercing operation appears seamless. For best results, use the following selector: `:not(piercing-fragment-outlet) > piercing-fragment-host[fragment-id="fragmentId"]`.         |
| `routePatterns`        | `string[]`                                                                                      | An array of route patterns this fragment should handle serving. Pattern format must adhere to [path-to-regexp](https://github.com/pillarjs/path-to-regexp#parameters) syntax.                                                                                                                                                                      |
| `upstream`             | `string`                                                                                        | The upstream URI of the fragment application. This will be fetched for any request paths matching the specified `routePatterns`.                                                                                                                                                                                                                   |
| `forwardFragmentHeaders?` | `string[]`                                                                                   | An optional list of fragment response headers to forward to the gateway response.                                                                                                                                                                                                                                                                 |
| `onSsrFetchError?`     | `(req: RequestInfo, failedResOrError: Response | unknown) => SSRFetchErrorResponse | Promise<SSRFetchErrorResponse>` | A handler or fallback to apply when the fetch for a fragment SSR code fails. It allows the gateway to serve a fallback response instead of an error response from the server. <br/> **Parameters:** <ul><li>`req`: The request sent to the fragment.</li><li>`failedResOrError`: The failed response (4xx/5xx status) or the thrown error.</li></ul> **Returns:** The response to use for the document's SSR. |