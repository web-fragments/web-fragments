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
import { renderToStream, type RenderToStreamOptions } from '@builder.io/qwik/server';
import { manifest } from '@qwik-client-manifest';
import Root from './root';

export default function (opts: RenderToStreamOptions) {
	const requestHeaders = opts.serverData?.requestHeaders ?? {}
	const originUrl =
		(requestHeaders['x-forwarded-host'] && requestHeaders['x-forwarded-proto']) ?
			// try to read x-forwarded-* headers
			`${requestHeaders['x-forwarded-proto']}://${requestHeaders['x-forwarded-host']}` :
			// fall back on the original url of the qwik server
			opts.serverData?.url;
	
	return renderToStream(<Root />, {
		...opts,
		base: '/_fragment/qwik/assets/build',
		manifest,
		// Use container attributes to set attributes on the html tag.
		containerAttributes: {
			lang: 'en-us',
			...opts.containerAttributes,
		},
		containerTagName: 'qwik-fragment',
		serverData: {
			...opts.serverData,
			url: originUrl
		},
		prefetchStrategy: {
			implementation: {
				linkInsert: null,
				workerFetchInsert: null,
				prefetchEvent: 'always',
			},
		},
		qwikLoader: {
			include: 'always',
			position: 'bottom',
		},
	});
}
