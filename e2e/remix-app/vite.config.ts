import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      // cross-repo development only!
      // requires writable-dom checked out as a sibling to `reframed`
      "writable-dom": new URL("../../../writable-dom/src/index.ts", import.meta.url).pathname,
    },
  },
});
