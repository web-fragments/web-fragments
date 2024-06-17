import { defineConfig } from "vite";
import reframedViteConfig from "../../reframed/vite.config.js";

export default defineConfig({
  appType: "mpa", // so that Vite returns 404 on fetch to an non-existent .html file
  resolve: {
    alias: {
      reframed: "../../../reframed/index.ts",
    },
  },
});
