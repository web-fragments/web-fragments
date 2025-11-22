# React Router 7 Fragment

This is a simple counter application built with React Router 7 that demonstrates web fragments functionality.

## Features

- Counter with increment/decrement buttons
- Copy counter value to clipboard
- Navigation between routes (`/` and `/rr-page`)
- Details page at `/rr-page/details`
- Styled with inline CSS
- Compatible with both pierced and fetched fragment modes

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Serve with Wrangler (Cloudflare Workers)
pnpm serve

# Build and serve
pnpm buildAndServe

# Deploy to Cloudflare
pnpm deploy
```

The fragment runs on port 3001 by default when using `pnpm start`.

## Integration

This fragment is integrated into:

1. **pierced-react sample** - Available at `/rr-page` route
2. **node-servers sample** - Available at `/rr-page` route

The fragment endpoint is registered as:
- Fragment ID: `react-router`
- Route patterns: `/rr-page/:_*`, `/_fragment/react-router/:_*`
- Endpoint: `http://localhost:3001`

## Tech Stack

- React Router 7
- React 18
- TypeScript
- Vite
- Cloudflare Workers (deployment target)
