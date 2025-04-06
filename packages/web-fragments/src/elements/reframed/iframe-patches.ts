import { ReframedShadowRoot, reframedMetadataSymbol } from './reframed';
import { execToInertScriptMap } from './script-execution';
import { assert } from './utils/assert';
import { rewriteQuerySelector } from './utils/selector-helpers';

/**
 * Apply monkey-patches to the source iframe so that we trick code running in it to behave as if it
 * was running in the main frame.
 */
export function initializeIFrameContext(
	iframe: HTMLIFrameElement,
	shadowRoot: ReframedShadowRoot,
	boundNavigation: boolean,
) {
	assert(
		iframe.contentWindow !== null && iframe.contentDocument !== null,
		'attempted to patch iframe before it was ready',
	);

	const iframeWindow = iframe.contentWindow as Window & typeof globalThis;
	const iframeDocument = iframe.contentDocument;

	// When an iframe element is added to the page, it always triggers a load event
	// even if the src is empty. In this case, don't monkey patch the iframe document
	// because we will end up doing it twice.
	if (iframeWindow?.location.origin === 'null' && iframeWindow?.location.protocol === 'about:') {
		return;
	}

	const mainDocument = shadowRoot.host.ownerDocument;
	const mainWindow = mainDocument.defaultView!;

	const globalConstructors: Function[] = Object.entries(Object.getOwnPropertyDescriptors(iframeWindow)).flatMap(
		([property, descriptor]) =>
			/^[A-Z]/.test(property) && typeof descriptor.value === 'function' ? descriptor.value : [],
	);

	function hasInstance(this: Function, instance: any) {
		const parentContextConstructor: Function = mainWindow[this.name as keyof typeof mainWindow];

		return (
			Function.prototype[Symbol.hasInstance].call(this, instance) ||
			(typeof parentContextConstructor === 'function' && instance instanceof parentContextConstructor)
		);
	}

	// extend global constructors to support instanceof checks using
	// their equivalent constructor from the parent execution context
	globalConstructors.forEach((constructor) => {
		Object.defineProperty(constructor, Symbol.hasInstance, {
			value: hasInstance,
		});
	});

	let updatedIframeTitle: string | undefined = undefined;

	setInternalReference(iframeDocument, 'body');

	const getUnpatchedIframeDocumentCurrentScript = Object.getOwnPropertyDescriptor(
		Object.getPrototypeOf(Object.getPrototypeOf(iframeDocument)),
		'currentScript',
	)!.get!.bind(iframeDocument);

	Object.defineProperties(iframeDocument, {
		title: {
			get: function () {
				return (
					updatedIframeTitle ??
					// https://html.spec.whatwg.org/multipage/dom.html#document.title
					shadowRoot.querySelector('title')?.textContent?.trim() ??
					'[reframed document]'
				);
			},
			set: function (newTitle: string) {
				updatedIframeTitle = newTitle;
			},
		},

		readyState: {
			get() {
				return shadowRoot[reframedMetadataSymbol].iframeDocumentReadyState;
			},
		},

		currentScript: {
			get() {
				// grab the currently executing script in the iframe, and map it to its clone in the main document
				return execToInertScriptMap.get(getUnpatchedIframeDocumentCurrentScript());
			},
		},

		// redirect getElementById to be a scoped reframedContainer.querySelector query
		getElementById: {
			value(id: string) {
				return shadowRoot.querySelector(`[id="${id}"]`);
			},
		},

		getElementsByClassName: {
			value(names: string) {
				return shadowRoot.firstElementChild?.getElementsByClassName(names);
			},
		},

		getElementsByName: {
			value(name: string) {
				return shadowRoot.querySelector(`[name="${name}"]`);
			},
		},

		getElementsByTagNameNS: {
			value(namespaceURI: string | null, name: string) {
				return shadowRoot.firstElementChild?.getElementsByTagNameNS(namespaceURI, name);
			},
		},

		// redirect to mainDocument
		activeElement: {
			get: () => {
				return shadowRoot.activeElement;
			},
		},

		styleSheets: {
			get: () => {
				return shadowRoot.styleSheets;
			},
		},

		dispatchEvent: {
			value(event: Event) {
				return shadowRoot.dispatchEvent(event);
			},
		},

		childElementCount: {
			get() {
				return shadowRoot.childElementCount;
			},
		},

		hasChildNodes: {
			value(id: string) {
				return shadowRoot.hasChildNodes();
			},
		},

		children: {
			get() {
				return shadowRoot.children;
			},
		},

		firstElementChild: {
			get() {
				return shadowRoot.firstElementChild;
			},
		},

		firstChild: {
			get() {
				return shadowRoot.firstChild;
			},
		},

		lastElementChild: {
			get() {
				return shadowRoot.lastElementChild;
			},
		},

		lastChild: {
			get() {
				return shadowRoot.lastChild;
			},
		},

		rootElement: {
			get() {
				return shadowRoot.firstChild;
			},
		},
	} satisfies Partial<Record<keyof Document, any>>);

	/**
	 * These properties are references to special elements in a Document (html, head, body).
	 * The browser does not allow multiple instances of these elements within a Document,
	 * so we cannot render true <html>, <head>, <body> elements within the shadowroot of a fragment.
	 *
	 * Instead, render custom elements (wf-html, wf-head, wf-body) that act like the html, head, and body.
	 * The tagName and nodeName properties of these custom elements are then
	 * patched to return "HTML", "HEAD", and "BODY", respectively.
	 *
	 * iframeDocument query methods must be patched for custom wf-html, wf-head, and wf-body elements.
	 * CSS Selector queries that contain html,head,body tag selectors are rewritten to the custom elements
	 */
	Object.defineProperties(iframeDocument, {
		querySelector: {
			value(selector: string) {
				return shadowRoot.querySelector(rewriteQuerySelector(selector));
			},
		},
		querySelectorAll: {
			value(selector: string) {
				return shadowRoot.querySelectorAll(rewriteQuerySelector(selector));
			},
		},
		getElementsByTagName: {
			value(tagName: string) {
				// The shadowRoot node itself does not have a getElementsByTagName method.
				// For html, head, and body, rely on the patched querySelectorAll method on iframeDocument.
				// This will return a NodeList instead of an HTMLCollection, which will suffice for most use cases.
				return shadowRoot.querySelectorAll(rewriteQuerySelector(tagName));
			},
		},
		documentElement: {
			get() {
				return shadowRoot.querySelector('wf-html') ?? shadowRoot.firstElementChild;
			},
		},
		head: {
			get() {
				return shadowRoot.querySelector('wf-head') ?? shadowRoot.firstElementChild;
			},
		},
		body: {
			get() {
				return shadowRoot.querySelector('wf-body') ?? shadowRoot.firstElementChild;
			},
		},
	});

	// WARNING: Be sure this class stays declared inside of this function!
	// We rely on each reframed context having its own instance of this constructor
	// so we can use an instanceof check to avoid double-handling the event inside
	// the same context it was dispatched from.
	class SyntheticPopStateEvent extends PopStateEvent {}

	if (boundNavigation) {
		// iframe window patches
		setInternalReference(iframeWindow, 'history');

		const historyProxy = new Proxy(mainWindow.history, {
			get(target, property, receiver) {
				if (typeof Object.getOwnPropertyDescriptor(History.prototype, property)?.value === 'function') {
					return function (this: unknown, ...args: unknown[]) {
						const result = Reflect.apply(
							History.prototype[property as keyof History],
							this === receiver ? target : this,
							args,
						);

						// dispatch a popstate event on the main window to inform listeners of a location change
						mainWindow.dispatchEvent(new SyntheticPopStateEvent('popstate'));
						return result;
					};
				}

				return Reflect.get(target, property, target);
			},
			set(target, property, receiver) {
				return Reflect.set(target, property, receiver);
			},
		});

		Object.defineProperties(iframeWindow, {
			history: {
				get() {
					return historyProxy;
				},
			},
		});
	} else {
		const standaloneHistoryStack: Array<{ state: any; title: string; url: string | null }> = [
			{ state: iframeWindow.history.state, title: iframeDocument.title, url: iframeWindow.location.href },
		];
		let standaloneHistoryCursor = 0;

		// for standalone fragments we should always use replaceState instead of pushState so that we don't create unexpected history entries
		// in order for back() and forward() to work correctly, we need to implement our own history stack with the behavior similar to window.history
		Object.defineProperties(iframeWindow.history, {
			pushState: {
				value: function reframedStandalonePushState(state: any, title: string, url?: string | null) {
					if (standaloneHistoryCursor !== standaloneHistoryStack.length - 1) {
						standaloneHistoryStack.splice(standaloneHistoryCursor + 1);
					}
					standaloneHistoryStack.push({ state, title, url: url ?? null });
					standaloneHistoryCursor++;
					iframeWindow.history.replaceState(state, title, url);
				},
			},

			back: {
				value: function reframedStandaloneBack() {
					if (standaloneHistoryCursor === 0) return;

					standaloneHistoryCursor--;

					let { state, title, url } = standaloneHistoryStack[standaloneHistoryCursor];
					iframeWindow.history.replaceState(state, title, url);
				},
			},

			forward: {
				value: function reframedStandaloneForward() {
					if (standaloneHistoryCursor === standaloneHistoryStack.length - 1) return;

					standaloneHistoryCursor++;

					let { state, title, url } = standaloneHistoryStack[standaloneHistoryCursor];
					iframeWindow.history.replaceState(state, title, url);
				},
			},

			length: {
				get() {
					return standaloneHistoryStack.length;
				},
			},
		});
	}

	iframeWindow.IntersectionObserver = mainWindow.IntersectionObserver;
	iframeWindow.MutationObserver = mainWindow.MutationObserver;
	iframeWindow.ResizeObserver = mainWindow.ResizeObserver;

	const windowSizeProperties: (keyof Pick<
		Window,
		'innerHeight' | 'innerWidth' | 'outerHeight' | 'outerWidth' | 'visualViewport'
	>)[] = ['innerHeight', 'innerWidth', 'outerHeight', 'outerWidth', 'visualViewport'];
	for (const windowSizeProperty of windowSizeProperties) {
		Object.defineProperty(iframeWindow, windowSizeProperty, {
			get: function reframedWindowSizeGetter() {
				return mainWindow[windowSizeProperty];
			},
		});
	}

	const domCreateProperties: (keyof Pick<
		Document,
		| 'createAttributeNS'
		| 'createCDATASection'
		| 'createComment'
		| 'createDocumentFragment'
		| 'createEvent'
		| 'createExpression'
		| 'createNSResolver'
		| 'createNodeIterator'
		| 'createProcessingInstruction'
		| 'createRange'
		| 'createTextNode'
		| 'createTreeWalker'
	>)[] = [
		'createAttributeNS',
		'createCDATASection',
		'createComment',
		'createDocumentFragment',
		'createEvent',
		'createExpression',
		'createNSResolver',
		'createNodeIterator',
		'createProcessingInstruction',
		'createRange',
		'createTextNode',
		'createTreeWalker',
	];
	for (const createProperty of domCreateProperties) {
		Object.defineProperty(iframeDocument, createProperty, {
			value: function reframedCreateFn() {
				// @ts-expect-error WTD?!?
				return mainDocument[createProperty].apply(mainDocument, arguments);
			},
		});
	}

	Object.defineProperties(iframeDocument, {
		createElement: {
			value: function createElement(...[tagName]: Parameters<Document['createElement']>) {
				return Document.prototype.createElement.apply(
					tagName.includes('-') ? iframeDocument : mainDocument,
					arguments as any,
				);
			},
		},
		createElementNS: {
			value: function createElementNS(...[namespaceURI, tagName]: Parameters<Document['createElementNS']>) {
				return Document.prototype.createElementNS.apply(
					namespaceURI === 'http://www.w3.org/1999/xhtml' && tagName.includes('-') ? iframeDocument : mainDocument,
					arguments as any,
				);
			},
		},
	});

	// Create an abort controller we'll use to remove event listeners when the iframe is destroyed
	const controller = new AbortController();

	// A list of events for which we don't want to retarget listeners.
	// Event listeners for these events should be added normally
	// instead of being redirected to other event targets.
	// TODO: there are probably a lot more events we don't want to redirect, e.g. "pagehide" / "pageshow"
	const nonRedirectedEvents = ['load', 'popstate', 'beforeunload', 'unload'];

	// Redirect event listeners (except for the events listed above)
	// from the iframe window or document to the main window or shadow root respectively.
	// We also inject an abort signal into the provided options
	// to handle cleanup of these listeners when the iframe is destroyed.
	iframeWindow.EventTarget.prototype.addEventListener = new Proxy(iframeWindow.EventTarget.prototype.addEventListener, {
		apply(target, thisArg, argumentsList) {
			const [eventName, listener, optionsOrCapture] = argumentsList as Parameters<typeof target>;

			const options =
				typeof optionsOrCapture === 'boolean'
					? { capture: optionsOrCapture }
					: typeof optionsOrCapture === 'object'
						? optionsOrCapture
						: {};

			// coalesce any provided signal with the one from our abort controller
			const signal = AbortSignal.any([controller.signal, options.signal].filter((signal) => signal != null));

			const modifiedArgumentsList = [eventName, listener, { ...options, signal }];

			// redirect event listeners added to window and document unless the event is allowlisted
			if (!nonRedirectedEvents.includes(eventName)) {
				if (thisArg === iframeWindow) {
					thisArg = mainWindow;
				} else if (thisArg === iframeDocument) {
					thisArg = shadowRoot;
				}
			}

			return Reflect.apply(target, thisArg, modifiedArgumentsList);
		},
	});

	iframeWindow.EventTarget.prototype.removeEventListener = new Proxy(
		iframeWindow.EventTarget.prototype.removeEventListener,
		{
			apply(target, thisArg, argumentsList) {
				const [eventName] = argumentsList as Parameters<typeof target>;

				// redirect event listener removal unless the event is allowlisted
				if (!nonRedirectedEvents.includes(eventName)) {
					if (thisArg === iframeWindow) {
						thisArg = mainWindow;
					} else if (thisArg === iframeDocument) {
						thisArg = shadowRoot;
					}
				}

				return Reflect.apply(target, thisArg, argumentsList);
			},
		},
	);

	if (boundNavigation) {
		// When a navigation event occurs on the main window, either programmatically through the History API or by the back/forward button,
		// we need to reflect those changes onto the iframe's location via history.replaceState().
		// Finally, dispatch a PopStateEvent so that fragments that are listening to popstate event are
		// made aware of a location change and retrigger their render updates.
		const handleNavigate = (e: Event) => {
			getInternalReference(iframeWindow, 'history').replaceState(window.history.state, '', window.location.href);

			if (e instanceof SyntheticPopStateEvent) {
				return;
			}

			iframeWindow.dispatchEvent(new PopStateEvent('popstate', e instanceof PopStateEvent ? e : undefined));
		};

		// reframed:navigate event is triggered by the patched main window.history methods
		window.addEventListener('reframed:navigate', handleNavigate, {
			signal: controller.signal,
		});

		// Forward the popstate event triggered on the main window to every registered iframe window
		window.addEventListener('popstate', handleNavigate, {
			signal: controller.signal,
		});
	}

	// cleanup event listeners attached to the window when the iframe gets destroyed.
	// TODO: using the "pagehide" event would be preferred over the discouraged "unload" event,
	// but we'd need to figure out how to restore the previously attached event if the page is resumed from the bfcache
	iframeWindow.addEventListener('unload', () => controller.abort());
}

const reframedReferencesSymbol = Symbol('reframed:references');

function setInternalReference<T extends object>(target: T, key: keyof T) {
	(target as any)[reframedReferencesSymbol] ??= {};
	(target as any)[reframedReferencesSymbol][key] = Reflect.get(target, key);
}

export function getInternalReference<T extends object, K extends keyof T>(target: T, key: K): T[K] {
	const references = (target as any)[reframedReferencesSymbol];
	if (!references || references[key] === undefined) {
		throw new Error(`Attempted to access internal reference "${String(key)}" before it was set.`);
	}

	return references[key];
}
