import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { PiercingGateway } from "../../packages/fragment-gateway/src/index";

function serverPiercing(): Plugin {
  return {
    name: "piercing-plugin",
    async configureServer(server) {
      let gateway: PiercingGateway | undefined;
      let serverAddressBaseUrl: string | undefined;
      server.httpServer?.once("listening", () => {
        const serverAddress = server.httpServer?.address();

        if (!serverAddress) {
          console.warn("Unexpected error, serverAddress no present");
          return;
        }

        serverAddressBaseUrl =
          typeof serverAddress === "string"
            ? serverAddress
            : `http://localhost:${serverAddress.port}`;

        gateway = new PiercingGateway({
          getLegacyAppBaseUrl() {
            return serverAddressBaseUrl!;
          },
          isolateFragments() {
            return false;
          },
          shouldPiercingBeEnabled: true,
        });

        gateway.registerFragment({
          fragmentId: "remix",
          // TODO: using a shadow dom here we can't use selectors that reply on the fragment-outlet/host elements
          //       so here we have some standard css that is always applied, we should look into removing this once
          //       the fragment gets reframed
          prePiercingStyles: `
            .remix-counter-page {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
            }
          `,
          shouldBeIncluded() {
            return true;
          },
          fetcher: async (req: Request) => {
            const url = new URL(req.url);
            // fetch from the pierced-react-remix-fragment (TODO: find a better solution than hardcoding the port here etc...)
            const newUrl = `http://localhost:3000${url.pathname}`;
            const newReq = new Request(newUrl, req);
            try {
              const resp = await fetch(newReq);
              return resp;
            } catch {
              console.warn('\x1b[33m\n🚧 Remix fragment not found, please spin up the pierced-react-remix-fragment (with remix-serve) and try again 🚧\n\x1b[0m');
              return new Response('FRAGMENT NOT FOUND!');
            }
          },
        });
      });

      server.middlewares.use(async (req, res, next) => {
        if(!gateway) return next();

        const shouldBypassGateway = req.headers["x-bypass-piercing-gateway"];
        if (shouldBypassGateway) return next();

        const isHtmlRequest = req.headers.accept?.includes("text/html");
        const isFragmentRequest = !!(req.url?.startsWith("/_fragment/"));

        if(!isHtmlRequest && !isFragmentRequest) return next();

        const url = `${serverAddressBaseUrl}${req.url}`;
        const headers = new Headers(
          Object.entries(req.headers) as [string, string][]
        );

        const request = new Request(url, { headers });
        // TODO: the following should support streaming
        const gatewayResponse = await gateway.fetch(request);

        const text = await gatewayResponse.text();

        gatewayResponse.headers.forEach((value, key) => {
          if(key === 'content-encoding') {
            // we're decoding the value so we need to remove this header
            return;
          }
          res.setHeader(key, value);
        });

        res.end(text);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), serverPiercing()],
});
