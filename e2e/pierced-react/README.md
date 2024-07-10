# Pierced-React app

To run the app (that shows the server side piercing) you need to run (in order):
 - `pnpm i` at the root of the monorepo
 - `pnpm build` in /reframed
 - `pnpm build` in /packages/web-fragments
 - `pnpm build && pnpm start` in /e2e/pierced-react-remix-fragment (and keep the process running)
 - `pnpm dev` in this directory (/e2e/pierced-react)
