# Middleware support

To support a diversity of request/response models, we are offering different middleware implementation types. 

## Standard middleware type

Standard middleware provides support to standard request, response, next object model, like the one used by 'Cloudflare Pages' or 'Service Workers'.

### Usage

Initialize the gateway and register the fragments

```javascript
import { FragmentGateway, getStandardMiddleware } from 'web-fragments/gateway';
// Initialize the FragmentGateway
const gateway = new FragmentGateway({
  prePiercingStyles: `<style id="fragment-piercing-styles" type="text/css">
    fragment-host[data-piercing="true"] {
      position: absolute;
      z-index: 9999999999999999999999999999999;
    }
  </style>`,
});

// Register fragments
gateway.registerFragment({
  fragmentId: 'remix',
  prePiercingClassNames: ['remix'],
  routePatterns: ['/remix-page/:_*', '/_fragment/remix/:_*'],
  endpoint: 'http://localhost:3000',
  upstream: 'http://localhost:3000',
  onSsrFetchError: () => ({
    response: new Response('<p>Remix fragment not found</p>', {
      headers: { 'content-type': 'text/html' },
    }),
  }),
});
```

Implement the corresponding handlers, for example for Cloudflare Pages

```javascript
const middleware = getStandardMiddleware(gateway, { mode: 'production' });

// CF Pages specific handler
export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context;
  console.log('Incoming request', request.url);
  
  // run the standard middleware function
  return middleware(request, next);
};
```

or for Service Workers, passing the native fetch function as next

```javascript
// Service Worker `fetch` event (service worker should have been previously registered)
self.addEventListener('fetch', (event) => {
  const request = event.request;

  event.respondWith(
    middleware(request, () => fetch(request))
  );
});
```

#### Service worker registration example
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
      console.log('Service Worker registered successfully:', registration);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}
```