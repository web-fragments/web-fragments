import WritableDOMStream from 'writable-dom';
import { initializeIFrameContext } from './iframe-patches';
import { initializeMainContext } from './main-patches';
import { executeScriptsInPiercedFragment } from './script-execution';

type ReframedOptions = {
	bound: boolean;
	container: HTMLElement;
	headers?: HeadersInit;
	name: string;
};

/**
 *
 * @param reframedSrcOrSourceShadowRoot url of an http endpoint that will generate html stream to be reframed, or a shadowRoot containing the html to reframe
 * @param containerTagName tag name of the HTMLElement that will be created and used as the target container.
 *    The default is [`article`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article).
 * @returns
 */
export function reframed(
	reframedSrcOrSourceShadowRoot: string | ShadowRoot,
	options: ReframedOptions,
): {
	iframe: HTMLIFrameElement;
	container: HTMLElement;
	ready: Promise<void>;
} {
	initializeMainContext(options.bound);

	/**
	 * Create the iframe that we'll use to load scripts into, but hide it from the viewport.
	 * It's important that we set the src of the iframe before we insert the element into the body
	 * in order to prevent loading the iframe twice when the src is changed later on.
	 */
	const iframe = document.createElement('iframe');
	iframe.hidden = true;

	const reframeMetadata: ReframedMetadata = {
		iframeDocumentReadyState: 'loading',
		iframe,
	};

	// create the reframed container
	const reframedContainer = options.container as ReframedContainer;

	const reframedContainerShadowRoot = Object.assign(
		reframedContainer.shadowRoot ?? reframedContainer.attachShadow({ mode: 'open' }),
		{
			[reframedMetadataSymbol]: reframeMetadata,
		},
	);

	// Since fragments will most likely contain other block elements, they should be blocks themselves by default
	const blockSheet = new CSSStyleSheet();
	blockSheet.insertRule(':host { display: block; position: relative; }');
	reframedContainer.shadowRoot?.adoptedStyleSheets.push(blockSheet);

	/**
	 * Initialize a promise and resolver for monkeyPatchIFrameDocument.
	 * We need to know when monkeyPatchIFrameDocument resolves so we can return from reframe()
	 * since this happens after the iframe loads.
	 */
	let { promise: iframeReady, resolve: resolveIframeReady } = Promise.withResolvers<void>();

	let alreadyLoaded = false;

	iframe.addEventListener('load', () => {
		if (alreadyLoaded) {
			// iframe reload detected!

			if (options.bound) {
				// let's update the main location.href
				location.href = iframe?.contentWindow?.location.href!;
			} else {
				// TODO: what to do here?
				// should we recreate the fragment with the new src?
				// the current fragment is broken because the JS code was unloaded, so we can't resurrect it any more
				// for now we just blow away the content
				console.warn('unbound fragment reload detected, clearing fragment content!');
				reframedContainer.shadowRoot.innerHTML = '';
			}
			return;
		}
		alreadyLoaded = true;

		initializeIFrameContext(iframe, reframedContainerShadowRoot, options.bound);
		resolveIframeReady();
	});

	let reframingDone: Promise<void>;

	if (typeof reframedSrcOrSourceShadowRoot === 'string') {
		reframingDone = reframeWithFetch(
			reframedSrcOrSourceShadowRoot,
			reframedContainer.shadowRoot as ParentNode,
			iframe,
			options,
			iframeReady,
		);
	} else {
		reframingDone = reframeFromTarget(reframedSrcOrSourceShadowRoot, iframe, options, iframeReady);
	}

	const ready = reframingDone.then(() => {
		reframedContainer.shadowRoot[reframedMetadataSymbol].iframeDocumentReadyState = 'interactive';
		reframedContainer.shadowRoot!.dispatchEvent(new Event('readystatechange'));
		reframedContainer.shadowRoot!.dispatchEvent(new Event('DOMContentLoaded'));
		// TODO: this should be called when reframed async loading activities finish
		//       (see: https://github.com/web-fragments/web-fragments/issues/36)
		setTimeout(() => {
			reframedContainer.shadowRoot[reframedMetadataSymbol].iframeDocumentReadyState = 'complete';
			reframedContainer.shadowRoot.dispatchEvent(new Event('readystatechange'));
			iframe.contentWindow?.dispatchEvent(new Event('load'));
		});
	});

	return {
		iframe,
		container: reframedContainer,
		ready,
	};
}

async function reframeWithFetch(
	reframedSrc: string,
	target: ParentNode,
	iframe: HTMLIFrameElement,
	options: ReframedOptions,
	iframeReady: Promise<void>,
): Promise<void> {
	console.debug('reframing (with fetch)!', {
		source: reframedSrc,
		targetContainer: target,
	});

	const reframedHtmlResponse = await fetch(reframedSrc, {
		headers: options.headers,
	});

	const reframedHtmlStream =
		reframedHtmlResponse.status === 200
			? reframedHtmlResponse.body!
			: stringToStream(
					`error fetching ${reframedSrc} (HTTP Status = ${
						reframedHtmlResponse.status
					})<hr>${await reframedHtmlResponse.text()}`,
				);

	const { promise, resolve } = Promise.withResolvers<void>();

	// It is important to set the src of the iframe AFTER we get the html stream response.
	// Doing so after ensures that the "iframe" load event triggers properly after content is streamed.
	iframe.src = reframedSrc;
	iframe.name = `wf:${options.name}`;

	iframeReady.then(() => {
		reframedHtmlStream
			.pipeThrough(new TextDecoderStream())
			.pipeTo(new WritableDOMStream(target))
			.finally(() => {
				import.meta.env.DEV &&
					console.log('reframing done (reframeWithFetch)!', {
						source: reframedSrc,
						target,
						title: iframe.contentDocument?.title,
					});
				resolve();
			});
	});

	// We can append the iframe to the main document only once the iframe[src] is set.
	// This is especially the case in Firefox where an extra history record is created for iframes appended for at least one turn of the event loop (a task), which then have their src is set.
	document.body.appendChild(iframe);

	return promise;
}

async function reframeFromTarget(
	source: ShadowRoot,
	iframe: HTMLIFrameElement,
	options: ReframedOptions,
	iframeReady: Promise<void>,
): Promise<void> {
	console.debug('reframing! (reframeFromTarget)', { source });

	iframe.src = location.pathname + location.search;
	iframe.name = `wf:${options.name}`;

	const { promise, resolve } = Promise.withResolvers<void>();

	iframeReady.then(() => {
		executeScriptsInPiercedFragment(source, iframe);

		import.meta.env.DEV &&
			console.log('reframing done (reframeFromTarget)!', {
				source,
				title: document.defaultView!.document.title,
			});
		resolve();
	});

	// We can append the iframe to the main document only once the iframe[src] is set.
	// This is especially the case in Firefox where an extra history record is created for iframes appended for at least one turn of the event loop (a task), which then have their src is set.
	document.body.appendChild(iframe);

	return promise;
}

/**
 * Utility to convert a string to a ReadableStream.
 */
const stringToStream = (str: string): ReadableStream => {
	return new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode(str));
			controller.close();
		},
	});
};

type ReframedMetadata = {
	/**
	 * Indicates what the value the iframe's document readyState should be.
	 *
	 * Note that we can't simply monkey patch this to the main document (since the iframe needs to have its own behavior regarding this state),
	 * so we need to directly manage this state ourselves.
	 */
	iframeDocumentReadyState: DocumentReadyState;
	iframe: HTMLIFrameElement;
};

export const reframedMetadataSymbol = Symbol('reframed:metadata');

export type ReframedShadowRoot = ShadowRoot & {
	[reframedMetadataSymbol]: ReframedMetadata;
};

type ReframedContainer = HTMLElement & {
	shadowRoot: ReframedShadowRoot;
};
