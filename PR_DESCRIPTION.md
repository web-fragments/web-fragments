# Pull Request: Node + Workers fragment stabilization and RR7 integration

## Summary
- Restructured sample assets and scripts so Cloudflare fragments and Node-based hosts share a single set of configs.
- Updated documentation and homepages to reflect the unified fragment lineup and platform support.
- Added a sample comparison table plus richer branding/storytelling across demos.
- Consolidated template styles to keep fragment hosts visually aligned and remove duplicated CSS overrides.
- Introduced a React Router 7 counter fragment and wired it into both Cloudflare Workers and Node middleware demos.

## Detailed Changes
### Pierced React (Cloudflare Workers)
- Re-enabled Wrangler TOML as the single source of truth and relaxed compatibility flags for local fragment fetches.
- Ensured fragment serve scripts bind to explicit ports (3000 Remix, 3001 React Router, 8123 Qwik) without pnpm argument hacks.
- Fixed React Router worker bootstrap to pass the Cloudflare event object and avoid `context.cloudflare` crashes.
- Added routing metadata, logos, and fetched-fragment toggling so React Router parity matches the existing fragments.

### Node Servers (Express & Connect)
- Added a `scripts/dev-with-fragments.mjs` orchestrator that boots all fragments before starting the chosen Node server.
- Updated package scripts (`dev`, `dev:express`, `dev:connect`) to use the orchestrator so developers don’t forget to start fragments.
- Injected server-specific hero pill labels and ensured every static HTML page replaces the `__SERVER_LABEL__` placeholder on load.
- Wired the React Router page into the client build (navigation links, rr-page.html entry, updated legacy bootstrap metadata).
- Added React Router branding assets and fragment metadata so soft/hard navigations work identically to Remix/Qwik pages.

### Docs & Styling
- Refreshed README/docs snippets to highlight the new fragment and shared configuration story.
- Migrated duplicated styles into the shared template to keep typography/buttons consistent across demos.
- Extended sample tables to cover the Node middleware pair alongside the Workers host.

## Testing
- `pnpm --filter pierced-react dev` (verifies Cloudflare fragments + host boot successfully)
- `npm run build` in `samples/node-servers/app/client` (ensures all static pages render with injected labels)
- `pnpm --filter node-servers dev:express` (manually verified start-up and routing)
- `node scripts/dev-with-fragments.mjs connect` (manual sanity of Connect middleware)

## Follow-Up
- Optional: capture screenshots/gifs of the React Router fragment running in both hosts for the docs page.
- Consider CI automation that runs the Node orchestrator in a smoke-test mode to catch port regressions earlier.
