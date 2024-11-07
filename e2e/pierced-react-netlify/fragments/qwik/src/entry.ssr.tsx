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
import {
	renderToStream,
	type RenderToStreamOptions,
} from "@builder.io/qwik/server";
import { manifest } from "@qwik-client-manifest";
import Root from "./root";

export default function (opts: RenderToStreamOptions) {
	return renderToStream(<Root />, {
		...opts,
		base: "/_fragment/qwik/assets/build",
		manifest,
		// Use container attributes to set attributes on the html tag.
		containerAttributes: {
			lang: "en-us",
			...opts.containerAttributes,
		},
		containerTagName: "qwik-fragment",
		serverData: {
			...opts.serverData,
			url: "http://localhost:8788/qwik-page",
		},
		prefetchStrategy: {
			implementation: {
				linkInsert: null,
				workerFetchInsert: null,
				prefetchEvent: "always",
			},
		},
		qwikLoader: {
			include: "always",
			position: "bottom",
		},
	});
}
