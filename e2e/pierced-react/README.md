# Pierced-React app

To run the app (that shows the server side piercing) you need to run (in order):
 - `pnpm i`
 - `pnpm --filter reframed --filter ./packages/web-fragments --filter ./e2e/pierced-react-remix-fragment build`
 - `pnpm --filter ./e2e/pierced-react-remix-fragment start`
 - in a new terminal: `pnpm --filter ./e2e/pierced-react dev`
