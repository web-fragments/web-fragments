import WritableDOMStream from "writable-dom";

type ReframedOptions = (
	| { container: HTMLElement }
	| { containerTagName: string }
) & {
	headers?: HeadersInit;
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
	options: ReframedOptions = {
		containerTagName: "article",
	}
): {
	iframe: HTMLIFrameElement;
	container: HTMLElement;
	ready: Promise<void>;
} {
	initializeParentExecutionContext();

	/**
	 * Create the iframe that we'll use to load scripts into, but hide it from the viewport.
	 * It's important that we set the src of the iframe before we insert the element into the body
	 * in order to prevent loading the iframe twice when the src is changed later on.
	 */
	const iframe = document.createElement("iframe");
	iframe.hidden = true;

	const reframeMetadata: ReframedMetadata = {
		iframeDocumentReadyState: "loading",
		iframe,
	};

	// create the reframed container
	const reframedContainer = (
		"container" in options
			? options.container
			: document.createElement(options.containerTagName)
	) as ReframedContainer;

	const reframedContainerShadowRoot = Object.assign(
		reframedContainer.shadowRoot ??
			reframedContainer.attachShadow({ mode: "open" }),
		{
			[reframedMetadataSymbol]: reframeMetadata,
		}
	);

	/**
	 * Initialize a promise and resolver for monkeyPatchIFrameDocument.
	 * We need to know when monkeyPatchIFrameDocument resolves so we can return from reframe()
	 * since this happens after the iframe loads.
	 */
	let { promise: monkeyPatchReady, resolve: resolveMonkeyPatchReady } =
		Promise.withResolvers<void>();

	iframe.addEventListener("load", () => {
		monkeyPatchIFrameEnvironment(iframe, reframedContainerShadowRoot);
		resolveMonkeyPatchReady();
	});

	let reframeReady: Promise<void>;

	if (typeof reframedSrcOrSourceShadowRoot === "string") {
		const reframedSrc = reframedSrcOrSourceShadowRoot;
		reframedContainer.setAttribute("reframed-src", reframedSrc);
		reframeReady = reframeWithFetch(
			reframedSrcOrSourceShadowRoot,
			reframedContainer.shadowRoot as ParentNode,
			iframe,
			options
		);
	} else {
		reframeReady = reframeFromTarget(reframedSrcOrSourceShadowRoot, iframe);
	}

	// Note: this line needs to be here as it needs to be added before all the reframing logic
	//       has added the various load event listeners
	document.body.insertAdjacentElement("beforeend", iframe);

	const ready = Promise.all([monkeyPatchReady, reframeReady]).then(() => {
		reframedContainer.shadowRoot[
			reframedMetadataSymbol
		].iframeDocumentReadyState = "interactive";
		reframedContainer.shadowRoot!.dispatchEvent(new Event("readystatechange"));
		// TODO: this should be called when reframed async loading activities finish
		//        (note: the 2s delay is completely arbitrary, this is a very temporary solution anyways)
		//       (see: https://github.com/web-fragments/web-fragments/issues/36)
		setTimeout(() => {
			reframedContainer.shadowRoot[
				reframedMetadataSymbol
			].iframeDocumentReadyState = "complete";
			reframedContainer.shadowRoot.dispatchEvent(new Event("readystatechange"));
		}, 2_000);
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
	options: ReframedOptions
): Promise<void> {
	console.debug("reframing (with fetch)!", {
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
					})<hr>${await reframedHtmlResponse.text()}`
				);

	const { promise, resolve } = Promise.withResolvers<void>();

	// It is important to set the src of the iframe AFTER we get the html stream response.
	// Doing so after ensures that the "iframe" load event triggers properly after content is streamed.
	iframe.src = reframedSrc;
	iframe.name = reframedSrc;

	iframe.addEventListener("load", () => {
		reframedHtmlStream
			.pipeThrough(new TextDecoderStream())
			.pipeTo(new WritableDOMStream(target))
			.finally(() => {
				import.meta.env.DEV &&
					console.log("reframing done (reframeWithFetch)!", {
						source: reframedSrc,
						target,
						title: iframe.contentDocument?.title,
					});
				resolve();
			});
	});

	return promise;
}

async function reframeFromTarget(
	source: ParentNode,
	iframe: HTMLIFrameElement
): Promise<void> {
	console.debug("reframing! (reframeFromTarget)", { source });

	iframe.src = document.location.href;

	const scripts = [...source.querySelectorAll("script")];

	const { promise, resolve } = Promise.withResolvers<void>();

	iframe.addEventListener("load", () => {
		scripts.forEach((script) => {
			const scriptType = script.getAttribute("data-script-type");
			script.removeAttribute("data-script-type");
			script.removeAttribute("type");
			if (scriptType) {
				script.setAttribute("type", scriptType);
			}

			assert(
				iframe.contentDocument !== null,
				"iframe.contentDocument is not defined"
			);

			getInternalReference(iframe.contentDocument, "body").appendChild(
				iframe.contentDocument.importNode(script, true)
			);
		});

		import.meta.env.DEV &&
			console.log("reframing done (reframeFromTarget)!", {
				source,
				title: document.defaultView!.document.title,
			});
		resolve();
	});

	return promise;
}

/**
 * Apply monkey-patches to the source iframe so that we trick code running in it to behave as if it
 * was running in the main frame.
 */
function monkeyPatchIFrameEnvironment(
	iframe: HTMLIFrameElement,
	shadowRoot: ReframedShadowRoot
) {
	assert(
		iframe.contentWindow !== null && iframe.contentDocument !== null,
		"attempted to patch iframe before it was ready"
	);

	const iframeWindow = iframe.contentWindow as Window & typeof globalThis;
	const iframeDocument = iframe.contentDocument;

	// When an iframe element is added to the page, it always triggers a load event
	// even if the src is empty. In this case, don't monkey patch the iframe document
	// because we will end up doing it twice.
	if (
		iframeWindow?.location.origin === "null" &&
		iframeWindow?.location.protocol === "about:"
	) {
		return;
	}

	const mainDocument = shadowRoot.ownerDocument;
	const mainWindow = mainDocument.defaultView!;

	const globalConstructors: Function[] = Object.entries(
		Object.getOwnPropertyDescriptors(iframeWindow)
	).flatMap(([property, descriptor]) =>
		/^[A-Z]/.test(property) && typeof descriptor.value === "function"
			? descriptor.value
			: []
	);

	function hasInstance(this: Function, instance: any) {
		const parentContextConstructor: Function =
			mainWindow[this.name as keyof typeof mainWindow];

		return (
			Function.prototype[Symbol.hasInstance].call(this, instance) ||
			(typeof parentContextConstructor === "function" &&
				instance instanceof parentContextConstructor)
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

	setInternalReference(iframeDocument, "body");

	Object.defineProperties(iframeDocument, {
		title: {
			get: function () {
				return (
					updatedIframeTitle ??
					// https://html.spec.whatwg.org/multipage/dom.html#document.title
					shadowRoot.querySelector("title")?.textContent?.trim() ??
					"[reframed document]"
				);
			},
			set: function (newTitle: string) {
				updatedIframeTitle = newTitle;
			},
		},

		readyState: {
			get() {
				if (
					shadowRoot[reframedMetadataSymbol].iframeDocumentReadyState ===
					"complete"
				) {
					console.warn(
						"reframed warning: `document.readyState` possibly returned `'complete'` prematurely. If your app is not working correctly, please see https://github.com/web-fragments/web-fragments/issues/36  and comment on this issue so that we can prioritize fixing it."
					);
				}
				return shadowRoot[reframedMetadataSymbol].iframeDocumentReadyState;
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

		getElementsByTagName: {
			value(name: string) {
				return shadowRoot.firstElementChild?.getElementsByTagName(name);
			},
		},

		getElementsByTagNameNS: {
			value(namespaceURI: string | null, name: string) {
				return shadowRoot.firstElementChild?.getElementsByTagNameNS(
					namespaceURI,
					name
				);
			},
		},

		querySelector: {
			value(selector: string) {
				return shadowRoot.querySelector(selector);
			},
		},

		querySelectorAll: {
			value(selector: string) {
				return shadowRoot.querySelectorAll(selector);
			},
		},

		// redirect to mainDocument
		activeElement: {
			get: () => {
				// TODO: we see event.target during dispatchEvent to be set to null, it's likely due to this patch... investigate why!
				return mainDocument.activeElement;
			},
		},

		// redirect to mainDocument
		head: {
			get: () => {
				// TODO should we enforce that there is a HEAD-like element under reframedContainer?
				return shadowRoot;
			},
		},

		body: {
			get: () => {
				// TODO should we enforce that there is a BODY-like element under reframedContainer?
				return shadowRoot.firstElementChild;
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

	// iframe window patches
	setInternalReference(iframeWindow, "history");

	// WARNING: Be sure this class stays declared inside of this function!
	// We rely on each reframed context having its own instance of this constructor
	// so we can use an instanceof check to avoid double-handling the event inside
	// the same context it was dispatched from.
	class SyntheticPopStateEvent extends PopStateEvent {}

	const historyProxy = new Proxy(mainWindow.history, {
		get(target, property, receiver) {
			if (
				typeof Object.getOwnPropertyDescriptor(History.prototype, property)
					?.value === "function"
			) {
				return function (this: unknown, ...args: unknown[]) {
					const result = Reflect.apply(
						History.prototype[property as keyof History],
						this === receiver ? target : this,
						args
					);

					// dispatch a popstate event on the main window to inform listeners of a location change
					mainWindow.dispatchEvent(new SyntheticPopStateEvent("popstate"));
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

	iframeWindow.IntersectionObserver = mainWindow.IntersectionObserver;

	const windowSizeProperties: (keyof Pick<
		Window,
		"innerHeight" | "innerWidth" | "outerHeight" | "outerWidth"
	>)[] = ["innerHeight", "innerWidth", "outerHeight", "outerWidth"];
	for (const windowSizeProperty of windowSizeProperties) {
		Object.defineProperty(iframeWindow, windowSizeProperty, {
			get: function reframedWindowSizeGetter() {
				return mainWindow[windowSizeProperty];
			},
		});
	}

	const domCreateProperties: (keyof Pick<
		Document,
		| "createAttributeNS"
		| "createCDATASection"
		| "createComment"
		| "createDocumentFragment"
		| "createEvent"
		| "createExpression"
		| "createNSResolver"
		| "createNodeIterator"
		| "createProcessingInstruction"
		| "createRange"
		| "createTextNode"
		| "createTreeWalker"
	>)[] = [
		"createAttributeNS",
		"createCDATASection",
		"createComment",
		"createDocumentFragment",
		"createEvent",
		"createExpression",
		"createNSResolver",
		"createNodeIterator",
		"createProcessingInstruction",
		"createRange",
		"createTextNode",
		"createTreeWalker",
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
			value: function createElement(
				...[tagName]: Parameters<Document["createElement"]>
			) {
				return Document.prototype.createElement.apply(
					tagName.includes("-") ? iframeDocument : mainDocument,
					arguments as any
				);
			},
		},
		createElementNS: {
			value: function createElementNS(
				...[namespaceURI, tagName]: Parameters<Document["createElementNS"]>
			) {
				return Document.prototype.createElementNS.apply(
					namespaceURI === "http://www.w3.org/1999/xhtml" &&
						tagName.includes("-")
						? iframeDocument
						: mainDocument,
					arguments as any
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
	const nonRedirectedEvents = ["DOMContentLoaded", "popstate", "unload"];

	// Redirect event listeners (except for the events listed above)
	// from the iframe window or document to the main window or shadow root respectively.
	// We also inject an abort signal into the provided options
	// to handle cleanup of these listeners when the iframe is destroyed.
	iframeWindow.EventTarget.prototype.addEventListener = new Proxy(
		iframeWindow.EventTarget.prototype.addEventListener,
		{
			apply(target, thisArg, argumentsList) {
				const [eventName, listener, optionsOrCapture] =
					argumentsList as Parameters<typeof target>;

				const options =
					typeof optionsOrCapture === "boolean"
						? { capture: optionsOrCapture }
						: typeof optionsOrCapture === "object"
							? optionsOrCapture
							: {};

				// coalesce any provided signal with the one from our abort controller
				const signal = AbortSignal.any(
					[controller.signal, options.signal].filter((signal) => signal != null)
				);

				const modifiedArgumentsList = [
					eventName,
					listener,
					{ ...options, signal },
				];

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
		}
	);

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
		}
	);

	// When a navigation event occurs on the main window, either programmatically through the History API or by the back/forward button,
	// we need to reflect those changes onto the iframe's location via history.replaceState().
	// Finally, dispatch a PopStateEvent so that fragments that are listening to popstate event are
	// made aware of a location change and retrigger their render updates.
	const handleNavigate = (e: Event) => {
		getInternalReference(iframeWindow, "history").replaceState(
			window.history.state,
			"",
			window.location.href
		);

		if (e instanceof SyntheticPopStateEvent) {
			return;
		}

		iframeWindow.dispatchEvent(
			new PopStateEvent("popstate", e instanceof PopStateEvent ? e : undefined)
		);
	};

	// reframed:navigate event is triggered by the patched main window.history methods
	window.addEventListener("reframed:navigate", handleNavigate, {
		signal: controller.signal,
	});

	// Forward the popstate event triggered on the main window to every registered iframe window
	window.addEventListener("popstate", handleNavigate, {
		signal: controller.signal,
	});

	// cleanup event listeners attached to the window when the iframe gets destroyed.
	// TODO: using the "pagehide" event would be preferred over the discouraged "unload" event,
	// but we'd need to figure out how to restore the previously attached event if the page is resumed from the bfcache
	iframeWindow.addEventListener("unload", () => controller.abort());
}

function monkeyPatchHistoryAPI() {
	/**
	 * window.location is read-only and non-configurable, so we can't patch it
	 *
	 * In a browsing context with one or more iframes, the history all frames contribute to
	 * is the joint history: https://www.w3.org/TR/2011/WD-html5-20110525/history.html#joint-session-history.
	 * This means that we need to be careful not to add duplicate entries to the
	 * history stack via pushState within the iframe as that would double the
	 * number of history entries that back/forward button would have to work through
	 *
	 * Therefore we do the following:
	 * - Store all the original history functions for both the iframe and the main window.
	 * - intercept all history.pushState history.replaceState calls and replay them in the main window
	 * - update the window.location within the iframe via history.replaceState
	 * - intercept window.addEventListener('popstate', ...) registration and forward it onto the main window
	 * - restore the main window history prototype when the iframe is removed
	 *
	 * Make sure we only patch main window history once
	 */

	const historyMethods: (keyof Omit<History, "length">)[] = [
		"pushState",
		"replaceState",
		"back",
		"forward",
		"go",
	];

	historyMethods.forEach((historyMethod) => {
		const originalFn = window.history[historyMethod];

		Object.defineProperty(window.history, historyMethod, {
			// TODO: come up with a better workaround that a no-op setter that doesn't break Qwik.
			// QwikCity tries to monkey-patch `pushState` and `replaceState` which results in a runtime error:
			//   TypeError: Cannot set property pushState of #<History> which only has a getter
			// https://github.com/QwikDev/qwik/blob/3c5e5a7614c3f64cbf89f1304dd59609053eddf0/packages/qwik-city/runtime/src/spa-init.ts#L127-L135
			set: () => {},
			get: () => {
				return function reframedHistoryGetter() {
					Reflect.apply(originalFn, window.history, arguments);
					window.dispatchEvent(new CustomEvent("reframed:navigate"));
				};
			},
			configurable: true,
		});
	});
}

function monkeyPatchDOMInsertionMethods() {
	// Patch DOM insertion methods to execute scripts in reframed context
	// Note: methods that parse text containing HTML (e.g. `Element.insertAdjacentHTML()`,
	// `Element.setHTMLUnsafe()`) do not execute any parsed script elements,
	// so they do not need to be patched.
	const _Element__replaceWith = Element.prototype.replaceWith;

	function executeScriptInReframedContext<T extends Node>(
		script: T & HTMLScriptElement,
		reframedContext: ReframedMetadata
	) {
		// If the script does not have a valid type attribute, treat the script node as a data block.
		// We can add the data block directly to the main document instead of the iframe context.
		const validScriptTypes = [
			"module",
			"text/javascript",
			"importmap",
			"speculationrules",
			"",
			null,
		];
		if (!validScriptTypes.includes(script.getAttribute("type"))) {
			return script;
		}

		const iframe = reframedContext.iframe;
		assert(
			iframe.contentDocument !== null,
			"iframe.contentDocument is not defined"
		);

		// Script nodes that do not have text content are not evaluated.
		// Add a reference of the script to the iframe. If text content is added later, the script is then evaluated.
		// Clone the empty script to the main document.
		if (!script.textContent) {
			const clone = document.importNode(script, true);
			getInternalReference(iframe.contentDocument, "body").appendChild(script);
			return clone;
		}

		// This function relies on the fact that scripts follow exactly-once execution semantics.
		// Scripts contain an internal `already started` flag to track whether they have already
		// been executed, and this flag survives cloning operations. So, this function ensures
		// that the exactly-once execution happens in the reframed context, then replaces the original
		// script instance with its already-executed clone in whatever node tree it might be within.
		// It also returns the already-executed clone so that the caller can update any
		// direct references they might be holding that point to the original script.
		const scriptToExecute = iframe.contentDocument.importNode(script, true);
		getInternalReference(iframe.contentDocument, "body").appendChild(
			scriptToExecute
		);
		const alreadyStartedScript = document.importNode(scriptToExecute, true);
		_Element__replaceWith.call(script, alreadyStartedScript);
		return alreadyStartedScript;
	}

	function executeAnyChildScripts(
		element: Node,
		reframedContext: ReframedMetadata
	) {
		const scripts = (element as Element).querySelectorAll?.("script") ?? [];
		scripts.forEach((script) =>
			executeScriptInReframedContext(script, reframedContext)
		);
	}

	function isWithinReframedDOM(node: Node) {
		const root = node.getRootNode();
		return isReframedShadowRoot(root);
	}

	function getReframedMetadata(node: Node) {
		const root = node.getRootNode();

		if (!isReframedShadowRoot(root)) {
			throw new Error("Missing reframed metadata!");
		}

		return root[reframedMetadataSymbol];
	}

	const _Node__appendChild = Node.prototype.appendChild;
	Node.prototype.appendChild = function appendChild(node) {
		if (isWithinReframedDOM(this)) {
			const reframedContext = getReframedMetadata(this);
			executeAnyChildScripts(node, reframedContext);
			if (node instanceof HTMLScriptElement) {
				node = arguments[0] = executeScriptInReframedContext(
					node,
					reframedContext
				);
			}
		}
		return _Node__appendChild.apply(this, arguments as any) as any;
	};

	const _Node__insertBefore = Node.prototype.insertBefore;
	Node.prototype.insertBefore = function insertBefore(node, child) {
		if (isWithinReframedDOM(this)) {
			const reframedContext = getReframedMetadata(this);
			executeAnyChildScripts(node, reframedContext);
			if (node instanceof HTMLScriptElement) {
				node = arguments[0] = executeScriptInReframedContext(
					node,
					reframedContext
				);
			}
		}
		return _Node__insertBefore.apply(this, arguments as any) as any;
	};

	const _Node__replaceChild = Node.prototype.replaceChild;
	Node.prototype.replaceChild = function replaceChild(node, child) {
		if (isWithinReframedDOM(this)) {
			const reframedContext = getReframedMetadata(this);

			executeAnyChildScripts(node, reframedContext);
			if (node instanceof HTMLScriptElement && isWithinReframedDOM(node)) {
				node = arguments[0] = executeScriptInReframedContext(
					node,
					reframedContext
				);
			}
		}
		return _Node__replaceChild.apply(this, arguments as any) as any;
	};

	const _Element__after = Element.prototype.after;
	Element.prototype.after = function after(...nodes) {
		if (isWithinReframedDOM(this)) {
			const reframedContext = getReframedMetadata(this);
			nodes.forEach((node, index) => {
				if (typeof node !== "string") {
					executeAnyChildScripts(node, reframedContext);
					if (node instanceof HTMLScriptElement) {
						node = arguments[index] = executeScriptInReframedContext(
							node,
							reframedContext
						);
					}
				}
			});
		}
		return _Element__after.apply(this, arguments as any) as any;
	};

	const _Element__append = Element.prototype.append;
	Element.prototype.append = function append(...nodes) {
		if (isWithinReframedDOM(this)) {
			const reframedContext = getReframedMetadata(this);
			nodes.forEach((node, index) => {
				if (typeof node !== "string") {
					executeAnyChildScripts(node, reframedContext);
					if (node instanceof HTMLScriptElement) {
						node = arguments[index] = executeScriptInReframedContext(
							node,
							reframedContext
						);
					}
				}
			});
		}
		return _Element__append.apply(this, arguments as any) as any;
	};

	const _Element__insertAdjacentElement =
		Element.prototype.insertAdjacentElement;
	Element.prototype.insertAdjacentElement = function insertAdjacentElement(
		where,
		element
	) {
		if (isWithinReframedDOM(this)) {
			const reframedContext = getReframedMetadata(this);

			executeAnyChildScripts(element, reframedContext);
			if (element instanceof HTMLScriptElement) {
				element = arguments[1] = executeScriptInReframedContext(
					element,
					reframedContext
				);
			}
		}
		return _Element__insertAdjacentElement.apply(this, arguments as any) as any;
	};

	const _Element__prepend = Element.prototype.prepend;
	Element.prototype.prepend = function prepend(...nodes) {
		if (isWithinReframedDOM(this)) {
			const reframedContext = getReframedMetadata(this);
			nodes.forEach((node, index) => {
				if (typeof node !== "string") {
					executeAnyChildScripts(node, reframedContext);
					if (node instanceof HTMLScriptElement) {
						node = arguments[index] = executeScriptInReframedContext(
							node,
							reframedContext
						);
					}
				}
			});
		}
		return _Element__prepend.apply(this, arguments as any) as any;
	};

	const _Element__replaceChildren = Element.prototype.replaceChildren;
	Element.prototype.replaceChildren = function replaceChildren(...nodes) {
		if (isWithinReframedDOM(this)) {
			const reframedContext = getReframedMetadata(this);
			nodes.forEach((node, index) => {
				if (typeof node !== "string") {
					executeAnyChildScripts(node, reframedContext);
					if (node instanceof HTMLScriptElement) {
						node = arguments[index] = executeScriptInReframedContext(
							node,
							reframedContext
						);
					}
				}
			});
		}
		return _Element__replaceChildren.apply(this, arguments as any) as any;
	};

	Element.prototype.replaceWith = function replaceWith(...nodes) {
		if (isWithinReframedDOM(this)) {
			const reframedContext = getReframedMetadata(this);
			nodes.forEach((node, index) => {
				if (typeof node !== "string") {
					executeAnyChildScripts(node, reframedContext);
					if (node instanceof HTMLScriptElement) {
						node = arguments[index] = executeScriptInReframedContext(
							node,
							reframedContext
						);
					}
				}
			});
		}
		return _Element__replaceWith.apply(this, arguments as any) as any;
	};
}

function initializeParentExecutionContext() {
	if (!(reframedInitializedSymbol in window)) {
		Object.assign(window, { [reframedInitializedSymbol]: true });
		monkeyPatchDOMInsertionMethods();
		monkeyPatchHistoryAPI();
	}
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

/**
 * A generic assertion function.
 *
 * Typescript doesn't seem to consider `console.assert` to be an assertion function so we have this wrapper
 * https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions
 */
function assert(value: boolean, message: string): asserts value {
	console.assert(value, message);
}

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

const reframedInitializedSymbol = Symbol("reframed:initialized");
const reframedMetadataSymbol = Symbol("reframed:metadata");
const reframedReferencesSymbol = Symbol("reframed:references");

type ReframedShadowRoot = ShadowRoot & {
	[reframedMetadataSymbol]: ReframedMetadata;
};

function isReframedShadowRoot(node: Node): node is ReframedShadowRoot {
	return (
		node instanceof ShadowRoot &&
		(node as ReframedShadowRoot)[reframedMetadataSymbol] !== undefined
	);
}

function setInternalReference<T extends object>(target: T, key: keyof T) {
	(target as any)[reframedReferencesSymbol] ??= {};
	(target as any)[reframedReferencesSymbol][key] = Reflect.get(target, key);
}

function getInternalReference<T extends object, K extends keyof T>(
	target: T,
	key: K
): T[K] {
	const references = (target as any)[reframedReferencesSymbol];
	if (!references || references[key] === undefined) {
		throw new Error(
			`Attempted to access internal reference "${String(key)}" before it was set.`
		);
	}

	return references[key];
}

type ReframedContainer = HTMLElement & {
	shadowRoot: ReframedShadowRoot;
};
