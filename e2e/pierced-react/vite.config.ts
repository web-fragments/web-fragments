import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { PiercingGateway } from "../../packages/fragment-gateway/src/index";

const gateway = new PiercingGateway({
  getLegacyAppBaseUrl() {
    // return env.APP_BASE_URL;
    return "http://localhost:5173";
  },
  isolateFragments() {
    return false;
  },
  shouldPiercingBeEnabled() {
    // TODO: enable piercing
    return false;
  },
});

gateway.registerFragment({
  fragmentId: "remix",
  prePiercingStyles: ``,
  shouldBeIncluded() {
    return true;
  },
  fetcher: () => {
    // TODO: return the proper remix fragment response
    return new Response("hello");
  },
});

function serverPiercing(): Plugin {
  return {
    name: "piercing-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const isNonFragmentHtmlRequest =
          req &&
          req.url &&
          req.headers.accept?.includes("text/html") &&
          !req.url.startsWith("/_fragment/");

        const shouldBypassGateway = req.headers["x-bypass-piercing-gateway"];

        if (isNonFragmentHtmlRequest && !shouldBypassGateway) {
          const url = `http://localhost:5173${req.url}`;
          // TODO: add headers and whatnot to request
          const request = new Request(url);
          // this is a standard html request, apply the piercing gateway
          // TODO: this should support streaming
          const html = await (await gateway.fetch(request)).text();
          res.end(html);
        } else {
          next();
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), serverPiercing()],
});
