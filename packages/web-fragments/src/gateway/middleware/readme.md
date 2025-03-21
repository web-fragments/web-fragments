# Middleware support

To support a diversity of request/response models, we are offering different middleware implementation types.

## Standard Web middleware type

Standard middleware provides support to standard request, response, next object model, like the one used by Cloudflare Pages & Workers, Netlify Edge Functions, or Vercel Edge Functions.

### Usage

Initialize the gateway and register the fragments

```javascript
import { FragmentGateway, getStandardMiddleware } from 'web-fragments/gateway';
// Initialize the FragmentGateway
const gateway = new FragmentGateway({
	piercingStyles: `<style id="fragment-piercing-styles" type="text/css">
    web-fragment-host[data-piercing="true"] {
      position: absolute;
      z-index: 9999999999999999999999999999999;
    }
  </style>`,
});

// Register fragments
gateway.registerFragment({
	fragmentId: 'remix',
	piercingClassNames: ['remix'],
	routePatterns: ['/remix-page/:_*', '/_fragment/remix/:_*'],
	endpoint: 'http://localhost:3000',
	onSsrFetchError: () => ({
		response: new Response('<p>Remix fragment not found</p>', {
			headers: { 'content-type': 'text/html' },
		}),
	}),
});
```

Implement the corresponding handlers, for example for Cloudflare Pages

```javascript
const middleware = getWebMiddleware(gateway, { mode: 'production' });

// CF Pages specific handler
export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context;
  console.log('Incoming request', request.url);

  // run the standard middleware function
  return middleware(request, next);
};
```

## Node.js support middleware type

### Usage

This is an example of usage with and [Express](http://expressjs.com) server

```javascript
import express from 'express';
import { FragmentGateway, getNodeMiddleware } from 'web-fragments/gateway';

const app = express();
const port = 3000;

// Initialize the FragmentGateway
const gateway = new FragmentGateway({
	piercingStyles: `<style id="fragment-piercing-styles" type="text/css">
        web-fragment-host[data-piercing="true"] {
            position: absolute;
            z-index: 9999999999999999999999999999999;
        }
    </style>`,
});

// Register fragments
gateway.registerFragment({
	fragmentId: 'example-fragment',
	piercingClassNames: ['example-class'],
	routePatterns: ['/example-path', '/_fragment/example-path'],
	endpoint: 'http://localhost:3001',
	onSsrFetchError: () => ({
		response: new Response('<p>Fragment not found</p>', {
			headers: { 'content-type': 'text/html' },
		}),
	}),
});

// Create the middleware
const middleware = getNodeMiddleware(gateway, {
	mode: 'production', // Use 'development' for dev mode
});

// Use the middleware in Express
app.use((req, res, next) => middleware(req, res, next));

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});
```
