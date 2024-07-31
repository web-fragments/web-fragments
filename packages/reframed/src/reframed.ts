import WritableDOMStream from "writable-dom";

/**
 *
 * @param reframedSrcOrSourceShadowRoot url of an http endpoint that will generate html stream to be reframed, or a shadowRoot containing the html to reframe
 * @param containerTagName tag name of the HTMLElement that will be created and used as the target container.
 *    The default is [`article`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article).
 * @returns
 */
export function reframed(
	reframedSrcOrSourceShadowRoot: string | ShadowRoot,
	options: { container: HTMLElement } | { containerTagName: string } = {
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
		const iframeDocument = iframe.contentDocument;
		assert(iframeDocument !== null, "iframe.contentDocument is defined");

		// When an iframe element is added to the page, it always triggers a load event
		// even if the src is empty. In this case, don't monkey patch the iframe document
		// because we will end up doing it twice.
		if (
			iframeDocument.defaultView?.location.origin === "null" &&
			iframeDocument.defaultView?.location.protocol === "about:"
		) {
			return;
		}

		monkeyPatchIFrameDocument(iframeDocument, reframedContainerShadowRoot);
		resolveMonkeyPatchReady();
	});

	let reframeReady: Promise<void>;

	if (typeof reframedSrcOrSourceShadowRoot === "string") {
		const reframedSrc = reframedSrcOrSourceShadowRoot;
		reframedContainer.setAttribute("reframed-src", reframedSrc);
		reframeReady = reframeWithFetch(
			reframedSrcOrSourceShadowRoot,
			reframedContainer.shadowRoot as ParentNode,
			iframe
		);
	} else {
		reframeReady = reframeFromTarget(reframedSrcOrSourceShadowRoot, iframe);
	}

	attachNavigationListeners(iframe);

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
	iframe: HTMLIFrameElement
): Promise<void> {
	console.debug("reframing (with fetch)!", {
		source: reframedSrc,
		targetContainer: target,
	});

	const reframedHtmlResponse = await fetch(reframedSrc);
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
			.pipeTo(
				new WritableDOMStream(target, {
					scriptLoadingDocument: iframe.contentDocument!,
				})
			)
			.finally(() => {
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
				!!(
					iframe.contentDocument && isReframedDocument(iframe.contentDocument)
				),
				"iframe.contentDocument is not a reframed document"
			);
			iframe.contentDocument.unreframedBody.appendChild(
				iframe.contentDocument.importNode(script, true)
			);
		});

		console.log("reframing done (reframeFromTarget)!", {
			source,
			title: document.defaultView!.document.title,
		});
		resolve();
	});

	return promise;
}

function attachNavigationListeners(iframe: HTMLIFrameElement) {
	const controller = new AbortController();
	const signal = controller.signal;

	// When a navigation event occurs on the main window, either programmatically through the History API or by the back/forward button,
	// we need to reflect those changes onto the iframe's history via replaceState().
	// replaceState() is used in order to avoid adding duplicate entries to the shared history stack.
	// Finally, dispatch a PopStateEvent so that fragments that are listening to popstate event re-trigger render updates
	const handleNavigate = () => {
		iframe.contentWindow?.history.replaceState(
			window.history.state,
			"",
			window.location.href
		);
		iframe.contentWindow?.dispatchEvent(new PopStateEvent("popstate"));
	};

	// reframed:navigate event is triggered by the patched main window.history methods
	window.addEventListener("reframed:navigate", handleNavigate, { signal });

	// Forward the popstate event triggered on the main window to every registered iframe window
	window.addEventListener("popstate", handleNavigate, { signal });

	// cleanup event listeners attached to the window when the iframe gets destroyed
	iframe.contentWindow?.addEventListener("unload", () => controller.abort());
}

/**
 * Apply monkey-patches to the source iframe so that we trick code running in it to behave as if it
 * was running in the main frame.
 */
function monkeyPatchIFrameDocument(
	iframeDocument: Document,
	shadowRoot: ReframedShadowRoot
) {
	const iframeDocumentPrototype = Object.getPrototypeOf(
		Object.getPrototypeOf(iframeDocument)
	);
	const mainDocument = shadowRoot.ownerDocument;
	const mainWindow = mainDocument.defaultView!;
	const iframeWindow = iframeDocument.defaultView!;
	const unpatchedIframeBody = iframeDocument.body;
	let updatedIframeTitle: string | undefined = undefined;

	Object.defineProperties(iframeDocumentPrototype, {
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

		// redirect getElementsByName to be a scoped reframedContainer.querySelector query
		getElementsByName: {
			value(name: string) {
				return shadowRoot.querySelector(`[name="${name}"]`);
			},
		},

		// redirect querySelector to be a scoped reframedContainer.querySelector query
		querySelector: {
			value(selector: string) {
				return shadowRoot.querySelector(selector);
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

		// @ts-ignore -- TODO: hack
		unreframedBody: {
			get: () => {
				return unpatchedIframeBody;
			},
		},

		stylesheets: {
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
	} satisfies Record<keyof Document, any>);

	// iframe window patches
	Object.defineProperties(iframeWindow, {
		history: {
			get() {
				return mainWindow.history;
			},
		},
	});

	iframeWindow.IntersectionObserver = mainWindow.IntersectionObserver;

	const domCreateProperties: (keyof Pick<
		Document,
		| "createAttributeNS"
		| "createCDATASection"
		| "createComment"
		| "createDocumentFragment"
		| "createElement"
		| "createElementNS"
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
		"createElement",
		"createElementNS",
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
		Object.defineProperty(iframeDocumentPrototype, createProperty, {
			value: function reframedCreateFn() {
				// @ts-expect-error WTD?!?
				return mainDocument[createProperty].apply(mainDocument, arguments);
			},
		});
	}

	// methods to query for elements that can be retargeted into the reframedContainer
	const domQueryProperties: (keyof Pick<
		Document,
		| "querySelector"
		| "querySelectorAll"
		| "getElementsByClassName"
		| "getElementsByTagName"
		| "getElementsByTagNameNS"
	>)[] = [
		"querySelector",
		"querySelectorAll",
		"getElementsByClassName",
		"getElementsByTagName",
		"getElementsByTagNameNS",
	];
	for (const queryProperty of domQueryProperties) {
		Object.defineProperty(iframeDocumentPrototype, queryProperty, {
			value: function reframedCreateFn() {
				// @ts-expect-error WTD?!?
				return shadowRoot[queryProperty].apply(shadowRoot, arguments);
			},
		});
	}

	// methods to manage document listeners
	const domListenerProperties: (keyof Pick<
		Document,
		"addEventListener" | "removeEventListener"
	>)[] = ["addEventListener", "removeEventListener"];
	for (const listenerProperty of domListenerProperties) {
		const originalDocumentFn = document[listenerProperty];
		Object.defineProperty(iframeDocumentPrototype, listenerProperty, {
			value: function reframedListenerFn(eventName: string) {
				if (eventName === "DOMContentLoaded") {
					// @ts-expect-error WTD?!?
					return originalDocumentFn.apply(document, arguments);
				}

				return shadowRoot[listenerProperty].apply(
					shadowRoot,
					// @ts-expect-error WTD?!?
					arguments
				);
			},
		});
	}

	// methods to manage window event listeners
	const mainWindowEventListeners: Parameters<Window["addEventListener"]>[] = [];
	Object.defineProperties(Object.getPrototypeOf(iframeWindow), {
		addEventListener: {
			get() {
				return function addEventListener(
					...[eventName]: Parameters<Window["addEventListener"]>
				) {
					const listenerArgs = [...arguments] as Parameters<
						Window["addEventListener"]
					>;

					// Do not attach the popstate event listener to the main window. Instead, keep it on the iframe window.
					// This is because we have patched window.history to dispatch a popstate event to the iframe window when:
					//   1. a popstate event is triggered on the main window; forward that event to the iframe window
					//   2. history.pushState or history.replaceState is called; a custom event (reframed:navigate) is triggered
					//      which in turn dispatches a popstate event on iframe window
					//
					// This will become unnecessary once libraries rely on Navigate API instead of History and pushState,
					// and subsequently the popstate event for changes to location
					if (eventName === "popstate") {
						//@ts-ignore todo: fix qwik-app tsconfig brings in web-worker lib
						mainWindow.addEventListener.apply(iframeWindow, listenerArgs);
						return;
					}

					// Store these event listeners so we can remove them later in an explicit cleanup function returned by monkeyPatchIframe()
					mainWindowEventListeners.push(listenerArgs);

					//@ts-ignore todo: fix qwik-app tsconfig brings in web-worker lib
					return mainWindow.addEventListener.apply(mainWindow, listenerArgs);
				};
			},
		},
		removeEventListener: {
			get() {
				return function removeEventListener(
					...[eventName]: Parameters<Window["removeEventListener"]>
				) {
					const listenerArgs = [...arguments] as Parameters<
						Window["addEventListener"]
					>;

					// Explicitly remove event listeners attached to iframe window that weren't patched to be added to main window
					if (eventName === "popstate") {
						//@ts-ignore todo: fix qwik-app tsconfig brings in web-worker lib
						mainWindow.removeEventListener.apply(iframeWindow, listenerArgs);
						return;
					}

					// Remove reference to main window event listener stored in-memory
					const index = mainWindowEventListeners.findIndex((args) =>
						args.every((arg, index) => arg === arguments[index])
					);

					if (index >= 0) {
						mainWindowEventListeners.splice(index, 1);
					}

					// Remove the event listener on main window normally
					//@ts-ignore todo: fix qwik-app tsconfig brings in web-worker lib
					return mainWindow.removeEventListener.apply(mainWindow, listenerArgs);
				};
			},
		},
	});
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

	// This function relies on the fact that scripts follow exactly-once execution semantics.
	// Scripts contain an internal `already started` flag to track whether they have already
	// been executed, and this flag survives cloning operations. So, this function ensures
	// that the exactly-once execution happens in the reframed context, then replaces the original
	// script instance with its already-executed clone in whatever node tree it might be within.
	// It also returns the already-executed clone so that the caller can update any
	// direct references they might be holding that point to the original script.
	function executeScriptInReframedContext<T extends Node>(
		script: T & HTMLScriptElement,
		reframedContext: ReframedMetadata
	) {
		const iframe = reframedContext.iframe;
		assert(
			iframe.contentDocument !== null,
			"iframe.contentDocument is not defined"
		);
		const scriptToExecute = iframe.contentDocument.importNode(script, true);
		(iframe.contentDocument as ReframedDocument).unreframedBody.appendChild(
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

type ReframedDocument = Document & {
	// TODO: this is a hack and needs to be removed
	unreframedBody: HTMLBodyElement;
};

function isReframedDocument(
	document: Document & { unreframedBody?: HTMLBodyElement }
): document is ReframedDocument {
	return "unreframedBody" in document;
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

type ReframedShadowRoot = ShadowRoot & {
	[reframedMetadataSymbol]: ReframedMetadata;
};

function isReframedShadowRoot(node: Node): node is ReframedShadowRoot {
	return (
		node instanceof ShadowRoot &&
		(node as ReframedShadowRoot)[reframedMetadataSymbol] !== undefined
	);
}

type ReframedContainer = HTMLElement & {
	shadowRoot: ReframedShadowRoot;
};
