import { resolve } from "path";
import { defineConfig } from "vite";

console.log("xxx", resolve(__dirname, "..", "reframed", "index.ts"));
export default defineConfig({
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, "..", "reframed", "index.ts"),
      name: "reframed",
      // the proper extensions will be added
      fileName: "reframed",
    },
    // rollupOptions: {
    //   external: [],
    //   output: {},
    // },
  },
});
