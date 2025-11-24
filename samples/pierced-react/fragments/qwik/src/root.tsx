import { component$, PrefetchGraph, PrefetchServiceWorker } from '@builder.io/qwik';
import { QwikCityProvider, RouterOutlet, ServiceWorkerRegister } from '@builder.io/qwik-city';
import { RouterHead } from './components/router-head/router-head';
import { isDev } from '@builder.io/qwik/build';

import './global.css';

export default component$(() => {
	/**
	 * The root of a QwikCity site always start with the <QwikCityProvider> component,
	 * immediately followed by the document's <head> and <body>.
	 *
	 * Don't remove the `<head>` and `<body>` elements.
	 */

	return (
		<QwikCityProvider>
			<RouterHead />
			<RouterOutlet />
			<PrefetchServiceWorker
				path="/_fragment/qwik/assets/build/qwik-prefetch-service-worker.js"
				scope="/_fragment/qwik/assets/build/"
			/>
			<PrefetchGraph base="/_fragment/qwik/assets/build/" />
		</QwikCityProvider>
	);
});
