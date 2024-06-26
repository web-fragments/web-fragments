import { RequestHandler } from "@builder.io/qwik-city";

/**
 * This is a Qwik middleware plugin that intercepts all http
 * requests from an iframe and returns an empty html response.
 *
 * This is done to enable setting iframe.src in reframed,
 * so that window.location (which is unpatchable and can't
 * be modified without triggering an undesirable iframe
 * reload) in the reframed context has the correct url.
 */
export const onRequest: RequestHandler = async (requestEvent) => {
    // for iframe
  // requestEvent.request.headers.get("sec-fetch-dest") === "iframe";
  // for document request
  if (requestEvent.request.headers.get("sec-fetch-dest") === "iframe") {
    // requestEvent.send
    // for json requestEvent.json
    // for html requestEvent.html
    throw requestEvent.html(200, "<html><body>hello world</body></html>");
  }
};