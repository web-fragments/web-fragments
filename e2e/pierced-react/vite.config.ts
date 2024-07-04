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
          prePiercingStyles: `
            :not(piercing-fragment-outlet) > piercing-fragment-host[fragment-id="remix"] {
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
            const newUrl = `http://localhost:1123${url.pathname}`;
            const newReq = new Request(newUrl, req);
            try {
              const resp = await fetch(newReq);
              return resp;
            } catch {
              console.warn('\x1b[33m\n🚧 Remix fragment not found, please spin up the pierced-react-remix-fragment and try again 🚧\n\x1b[0m');
              return new Response('FRAGMENT NOT FOUND!');
            }
          },
        });
      });

      server.middlewares.use(async (req, res, next) => {
        const isNonFragmentHtmlRequest =
          req &&
          req.url &&
          req.headers.accept?.includes("text/html") &&
          !req.url.startsWith("/_fragment/");

        const shouldBypassGateway = req.headers["x-bypass-piercing-gateway"];

        if (gateway && isNonFragmentHtmlRequest && !shouldBypassGateway) {
          const url = `${serverAddressBaseUrl}${req.url}`;
          const headers = new Headers(
            Object.entries(req.headers) as [string, string][]
          );
          const request = new Request(url, { headers });
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
