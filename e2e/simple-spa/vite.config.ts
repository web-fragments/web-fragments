import {resolve} from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  appType: "mpa", // so that Vite returns 404 on fetch to an non-existent .html file
  resolve: {
    alias: {
      reframed: resolve(__dirname, "../../reframed/index.ts"),

      // cross-repo development only!
      // requires writable-dom checked out as a sibling to `reframed`
      //"writable-dom": resolve(__dirname, "../../../writable-dom/src/index.ts"),
    },
  },
});
