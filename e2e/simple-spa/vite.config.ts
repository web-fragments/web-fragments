import { defineConfig } from "vite";
import reframedViteConfig from "../../reframed/vite.config.js";
import { resolve } from "node:path";

console.log(resolve(__dirname, "../../../github/writable-dom/src/index.ts"));

export default defineConfig({
  appType: "mpa", // so that Vite returns 404 on fetch to an non-existent .html file
  resolve: {
    alias: {
      reframed: resolve(__dirname, "../../reframed/index.ts"),
      //"writable-dom": resolve(__dirname, "../../../github/writable-dom/src/index.ts"),
    },
  },
});
