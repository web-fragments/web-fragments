/**
 * WHAT IS THIS FILE?
 *
 * SSR entry point, in all cases the application is rendered outside the browser, this
 * entry point will be the common one.
 *
 * - Server (express, cloudflare...)
 * - npm run start
 * - npm run preview
 * - npm run build
 *
 */
import { component$ } from "@builder.io/qwik";

import {
  renderToStream,
  type RenderToStreamOptions,
} from "@builder.io/qwik/server";
import { manifest } from "@qwik-client-manifest";
import Root from "./root";
import Empty from "./empty";

export default function (opts: RenderToStreamOptions) {
  if (opts.serverData['requestHeaders']['sec-fetch-dest'] === 'iframe') {
    return renderToStream(
      <Empty/>,
        {
      manifest,
      ...opts,
      containerTagName: '<body>',
      qwikLoader: {
        include: 'never'
      }
    });
  }
  return renderToStream(<Root />, {
    manifest,
    ...opts,

    // needed for reframing/fragmenting
    containerTagName: 'qwik-fragment',
    qwikLoader: {
      include: 'always',
      position: 'bottom',
    },

    // Use container attributes to set attributes on the html tag.
    containerAttributes: {
      lang: "en-us",
      ...opts.containerAttributes,
    },
    serverData: {
      ...opts.serverData,
    },
  });
}
