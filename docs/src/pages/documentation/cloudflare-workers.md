---
title: "Deploying Web Fragments on Cloudflare Workers"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: October 28, 2025

Cloudflare Workers provides an excellent platform for deploying Web Fragments, offering global edge deployment and powerful service integration features. This guide walks you through deploying a Web Fragments architecture on Cloudflare, with special attention to patterns that maximize performance and maintainability.

## Understanding the Cloudflare Workers Architecture

When deploying Web Fragments on Cloudflare, you'll typically work with multiple workers that communicate using **Service Bindings** rather than traditional HTTP requests. Think of Service Bindings as direct, internal connections between your workers; like having a private network where your services can talk to each other without going through the public internet.

Here's the typical setup:

```
User's Browser
     ↓
Gateway Worker (public-facing)
     ├─→ Fragment Worker 1 (via Service Binding)
     ├─→ Fragment Worker 2 (via Service Binding)
     └─→ Static Assets (via Assets Binding)
```

This architecture gives you several advantages:

- **Performance**: Service Bindings eliminate network overhead
- **Security**: Backend workers don't need public URLs
- **Simplicity**: No CORS configuration needed
- **Cost**: No outbound HTTP requests between your own workers

## Setting Up Your Project

### 1. Create a Monorepo Structure (optional)

We recommend organizing your project as a monorepo using pnpm workspaces. This makes it easier to manage multiple workers and share dependencies:

```
my-app/
├── pnpm-workspace.yaml
└── packages/
    ├── gateway/          # Public-facing gateway worker
    ├── shell-app/        # Your existing SPA (React, Vue, etc.)
    └── fragment-app/     # Your web fragment
```

Create a `pnpm-workspace.yaml` at the root:

```yaml
packages:
  - "packages/*"
```

### 2. Configure Your Fragment Worker

Let's start with the fragment. The independent application you want to embed. Here's a typical `wrangler.toml` for a Remix-based fragment:

```toml
# packages/fragment-app/wrangler.toml
name = "my-fragment"
main = "./workers/app.ts"
compatibility_date = "2025-10-28"

# This worker doesn't need a public URL
# It will only be accessed via Service Binding
workers_dev = false
```

The key insight here is `workers_dev = false` Your fragment doesn't need its own public URL because it will be accessed through the gateway.

### 3. Configure Your Gateway Worker

The gateway is where the magic happens. It's the only worker with a public URL, and it coordinates everything:

```toml
# packages/gateway/wrangler.toml
name = "my-gateway"
main = "src/index.ts"
compatibility_date = "2025-10-28"

# This is your public entry point
workers_dev = true

# Serve your SPA's static files
[assets]
binding = "ASSETS"
directory = "../shell-app/dist"

# Connect to your fragment via Service Binding
[[services]]
binding = "FRAGMENT_SERVICE"
service = "my-fragment"
```

Let's break down what's happening:

- **Assets Binding**: Points to your shell application's build output. The gateway will serve these files directly.
- **Service Binding**: Creates a direct connection to your fragment worker. The `binding` name (`FRAGMENT_SERVICE`) is how you'll reference it in code.

### 4. Implement the Gateway

Now let's look at the gateway's code. This is where Web Fragments really shines:

```typescript
// packages/gateway/src/index.ts
import { FragmentGateway, getWebMiddleware } from "web-fragments/gateway";
import type { Fetcher } from "@cloudflare/workers-types";

export interface Env {
	ASSETS: {
		fetch: (request: Request) => Promise<Response>;
	};
	FRAGMENT_SERVICE: Fetcher;
}

export default {
	async fetch(request: Request, env: Env, _ctx) {
		// Create the gateway inside the fetch handler
		// This ensures we have access to env bindings
		const gateway = new FragmentGateway();

		// Register your fragment
		gateway.registerFragment({
			fragmentId: "my-fragment",
			// The endpoint is your Service Binding's fetch method
			endpoint: env.FRAGMENT_SERVICE.fetch.bind(env.FRAGMENT_SERVICE),
			routePatterns: [
				// When users visit /dashboard in the shell app, route to this fragment
				// Note: The fragment's internal routes don't need to match this path
				// For example, your fragment might only have a "/" route, but the gateway
				// mounts it at /dashboard. The fragment uses basename config to handle this.
				"/dashboard/:_*",
				// Handle fragment assets (the :_* means "match everything after")
				"/__wf/my-fragment.workers.dev/:_*",
				// Handle any assets your fragment requests
				"/assets/:_*",
			],
			// Only forward headers that your fragment needs
			// This reduces payload size and improves security
			forwardFragmentHeaders: ["accept-language", "user-agent", "cookie"],
		});

		// Get the Web Fragments middleware
		const middleware = getWebMiddleware(gateway, {
			mode: "production",
		});

		// Handle CORS preflight if needed
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, x-fragment-mode, x-web-fragment-id",
				},
			});
		}

		// Let the middleware handle routing
		return middleware(request, async () => {
			// Fallback: serve your shell application assets
			// This runs when the request doesn't match any fragment routes
			return env.ASSETS.fetch(request);
		});
	},
};
```

#### Understanding Route Patterns

The `routePatterns` array tells the gateway which URLs should be routed to your fragment:

- **Application routes**: `/dashboard/:_*` matches `/dashboard` and any nested paths
- **Asset routes**: `/__wf/my-fragment.workers.dev/:_*` is the unique prefix for your fragment's assets
- **Wildcard**: The `:_*` syntax means "match everything that follows"

Think of route patterns as traffic signs for your gateway...they tell it where to send each request.

**Important**: Your fragment worker must be configured to handle the path where the gateway mounts it. If the gateway routes `/dashboard/:_*` to your fragment, your fragment needs to expect requests at `/dashboard`. See your framework's documentation for handling base paths (e.g., Remix's `basename` option).

#### Header Forwarding

The `forwardFragmentHeaders` option is crucial for performance and security:

```typescript
forwardFragmentHeaders: ["accept-language", "user-agent", "cookie"];
```

Only forward headers your fragment actually needs. This keeps the payload small and prevents leaking sensitive information. For example, a simple UI component probably doesn't need cookies, but an authenticated dashboard does.

### 5. Initialize Web Fragments in Your Shell App

In your shell application's entry point (e.g., React's `index.tsx`):

```typescript
// packages/shell-app/src/index.tsx
import { initializeWebFragments } from 'web-fragments';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Initialize as early as possible
initializeWebFragments();

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'dashboard',
        // This is where your fragment will render
        element: <web-fragment fragment-id="my-fragment"></web-fragment>,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
```

That's it! One simple custom element with a `fragment-id`. The gateway handles all the complexity of routing and loading.

## Local Development

When developing locally with Service Bindings, you need to run each worker in its own terminal. This simulates the production environment:

```bash
# Terminal 1: Start your fragment
cd packages/fragment-app
pnpm dev

# Terminal 2: Start the gateway
cd packages/gateway
pnpm dev

# Terminal 3 (optional): Build your shell app in watch mode
cd packages/shell-app
pnpm dev
```

Each worker runs on its own port, and Wrangler automatically connects the Service Bindings during local development. You'll access everything through the gateway's URL.

## Deployment

**You must deploy in the correct order:**

### Deploy Backend Services First

```bash
# 1. Deploy your fragment(s)
cd packages/fragment-app
pnpm run build
wrangler deploy

# 2. Deploy the gateway last
cd packages/gateway
pnpm run build
wrangler deploy
```

Why this order? The gateway's Service Bindings need the other workers to exist. If you deploy the gateway first, it will fail because it can't find the services it's trying to bind to.

Think of it like building a house. You need the foundation and walls (fragments) before you can install the front door (gateway).

## Multiple Fragments

The gateway can coordinate multiple fragments simultaneously:

```typescript
gateway.registerFragment({
	fragmentId: "dashboard",
	endpoint: env.DASHBOARD_SERVICE.fetch.bind(env.DASHBOARD_SERVICE),
	routePatterns: ["/dashboard/:_*", "/__wf/dashboard.workers.dev/:_*"],
});

gateway.registerFragment({
	fragmentId: "reports",
	endpoint: env.REPORTS_SERVICE.fetch.bind(env.REPORTS_SERVICE),
	routePatterns: ["/reports/:_*", "/__wf/reports.workers.dev/:_*"],
});
```

Each fragment operates independently, they can use different frameworks, have different teams maintaining them, and deploy on their own schedules.

### Environment-Specific Configuration

Use Wrangler environments for different deployment stages:

```toml
# wrangler.toml
[env.staging]
name = "my-gateway-staging"

[env.staging.services]
binding = "FRAGMENT_SERVICE"
service = "my-fragment-staging"

[env.production]
name = "my-gateway-production"

[env.production.services]
binding = "FRAGMENT_SERVICE"
service = "my-fragment-production"
```

Deploy to staging with: `wrangler deploy --env staging`

## Common Pitfalls and Solutions

<details>
<summary><strong>"Service not found" Error</strong></summary>

**Problem**: You get an error saying the service binding can't be found.

**Solution**: Deploy your fragment workers before deploying the gateway. Also verify the service name in `wrangler.toml` matches exactly.

</details>

<details>
<summary><strong>Assets Not Loading</strong></summary>

**Problem**: Your shell app's assets return 404 errors.

**Solution**: Check that the `directory` in your assets binding points to the correct build output. For Vite projects, this is usually `dist/`.

</details>

<details>
<summary><strong>Fragment Routes Not Matching</strong></summary>

**Problem**: Your fragment isn't being invoked when you navigate to its route.

**Solution**: Verify your `routePatterns` array includes the routes you're accessing. Remember that the patterns need to match both the application routes (like `/dashboard`) and the asset routes (like `/__wf/...`).

</details>

<details>
<summary><strong>Development Mode Issues</strong></summary>

**Problem**: Service Bindings aren't working in local development.

**Solution**: Make sure you're running each worker's `dev` command in separate terminals. Wrangler needs all services running to connect them.

</details>

<details>
<summary><strong>Performance Considerations</strong></summary>

Cloudflare Workers with Service Bindings offers exceptional performance, but here are some tips to maximize it:

1. **Minimize Header Forwarding**: Only forward headers your fragment needs
2. **Use Edge Caching**: Configure appropriate cache headers for static assets
3. **Optimize Fragment Size**: Keep fragments focused and lightweight
4. **Leverage Durable Objects**: For stateful fragments that need coordination

</details>

<details>
<summary><strong>Security Best Practices</strong></summary>

1. **Never expose backend workers**: Set `workers_dev = false` for fragments
2. **Validate fragment requests**: Use the gateway to enforce authentication
3. **Limit header forwarding**: Don't forward sensitive headers unnecessarily
4. **Use secrets properly**: Store sensitive values in Wrangler secrets, not in code

</details>

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/eduardo-vargas">Eduardo-Vargas</a></li>
</ul>
