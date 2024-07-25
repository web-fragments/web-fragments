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
	ready: Promise<() => void>;
} {
	const reframeMetadata: ReframedMetadata = {
		iframeDocumentReadyState: "loading",
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
	 * Create the iframe that we'll use to load scripts into, but hide it from the viewport.
	 * It's important that we set the src of the iframe before we insert the element into the body
	 * in order to prevent loading the iframe twice when the src is changed later on.
	 */
	const iframe = document.createElement("iframe");
	iframe.hidden = true;

	/**
	 * Initialize a promise and resolver for monkeyPatchIFrameDocument.
	 * We need to know when monkeyPatchIFrameDocument resolves so we can return from reframe()
	 * since this happens after the iframe loads.
	 */
	let { promise: monkeyPatchReady, resolve: resolveMonkeyPatchReady } =
		Promise.withResolvers<() => void>();

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

		const restoreParentWindow = monkeyPatchIFrameDocument(
			iframeDocument,
			reframedContainerShadowRoot
		);
		resolveMonkeyPatchReady(restoreParentWindow);
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

	// Note: this line needs to be here as it needs to be added before all the reframing logic
	//       has added the various load event listeners
	document.body.insertAdjacentElement("beforeend", iframe);

	const ready = Promise.all([monkeyPatchReady, reframeReady]).then(
		([cleanup]) => {
			reframedContainer.shadowRoot[
				reframedMetadataSymbol
			].iframeDocumentReadyState = "interactive";
			reframedContainer.shadowRoot!.dispatchEvent(
				new Event("readystatechange")
			);
			// TODO: this should be called when reframed async loading activities finish
			//        (note: the 2s delay is completely arbitrary, this is a very temporary solution anyways)
			//       (see: https://github.com/web-fragments/web-fragments/issues/36)
			setTimeout(() => {
				reframedContainer.shadowRoot[
					reframedMetadataSymbol
				].iframeDocumentReadyState = "complete";
				reframedContainer.shadowRoot.dispatchEvent(
					new Event("readystatechange")
				);
			}, 2_000);

			return cleanup;
		}
	);

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

/**
 * Apply monkey-patches to the source iframe so that we trick code running in it to behave as if it
 * was running in the main frame.
 */
function monkeyPatchIFrameDocument(
	iframeDocument: Document,
	shadowRoot: ReframedShadowRoot
): () => void {
	const iframeDocumentPrototype = Object.getPrototypeOf(
		Object.getPrototypeOf(iframeDocument)
	);
	const mainDocument = shadowRoot.ownerDocument;
	const mainDocumentPrototype = Object.getPrototypeOf(
		Object.getPrototypeOf(mainDocument)
	);
	const mainWindow = mainDocument.defaultView!;
	const iframeWindow = iframeDocument.defaultView!;
	let updatedIframeTitle: string | undefined = undefined;

	const unpatchedIframeDocumentPrototypeProps =
		Object.getOwnPropertyDescriptors(iframeDocumentPrototype);
	const unpatchedIframeBody = iframeDocument.body;

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
		script: T & HTMLScriptElement
	) {
		const scriptToExecute = iframeDocument.importNode(script, true);
		unpatchedIframeBody.appendChild(scriptToExecute);
		const alreadyStartedScript = document.importNode(scriptToExecute, true);
		_Element__replaceWith.call(script, alreadyStartedScript);
		return alreadyStartedScript;
	}

	function executeAnyChildScripts(element: Node) {
		const scripts = (element as Element).querySelectorAll?.("script") ?? [];
		scripts.forEach(executeScriptInReframedContext);
	}

	const _Node__appendChild = Node.prototype.appendChild;
	Node.prototype.appendChild = function appendChild(node) {
		executeAnyChildScripts(node);
		if (node instanceof HTMLScriptElement) {
			node = arguments[0] = executeScriptInReframedContext(node);
		}
		return _Node__appendChild.apply(this, arguments as any) as any;
	};

	const _Node__insertBefore = Node.prototype.insertBefore;
	Node.prototype.insertBefore = function insertBefore(node, child) {
		executeAnyChildScripts(node);
		if (node instanceof HTMLScriptElement) {
			node = arguments[0] = executeScriptInReframedContext(node);
		}
		return _Node__insertBefore.apply(this, arguments as any) as any;
	};

	const _Node__replaceChild = Node.prototype.replaceChild;
	Node.prototype.replaceChild = function replaceChild(node, child) {
		executeAnyChildScripts(node);
		if (node instanceof HTMLScriptElement) {
			node = arguments[0] = executeScriptInReframedContext(node);
		}
		return _Node__replaceChild.apply(this, arguments as any) as any;
	};

	const _Element__after = Element.prototype.after;
	Element.prototype.after = function after(...nodes) {
		nodes.forEach((node, index) => {
			if (typeof node !== "string") {
				executeAnyChildScripts(node);
				if (node instanceof HTMLScriptElement) {
					node = arguments[index] = executeScriptInReframedContext(node);
				}
			}
		});
		return _Element__after.apply(this, arguments as any) as any;
	};

	const _Element__append = Element.prototype.append;
	Element.prototype.append = function append(...nodes) {
		nodes.forEach((node, index) => {
			if (typeof node !== "string") {
				executeAnyChildScripts(node);
				if (node instanceof HTMLScriptElement) {
					node = arguments[index] = executeScriptInReframedContext(node);
				}
			}
		});
		return _Element__append.apply(this, arguments as any) as any;
	};

	const _Element__insertAdjacentElement =
		Element.prototype.insertAdjacentElement;
	Element.prototype.insertAdjacentElement = function insertAdjacentElement(
		where,
		element
	) {
		executeAnyChildScripts(element);
		if (element instanceof HTMLScriptElement) {
			element = arguments[1] = executeScriptInReframedContext(element);
		}
		return _Element__insertAdjacentElement.apply(this, arguments as any) as any;
	};

	const _Element__prepend = Element.prototype.prepend;
	Element.prototype.prepend = function prepend(...nodes) {
		nodes.forEach((node, index) => {
			if (typeof node !== "string") {
				executeAnyChildScripts(node);
				if (node instanceof HTMLScriptElement) {
					node = arguments[index] = executeScriptInReframedContext(node);
				}
			}
		});
		return _Element__prepend.apply(this, arguments as any) as any;
	};

	const _Element__replaceChildren = Element.prototype.replaceChildren;
	Element.prototype.replaceChildren = function replaceChildren(...nodes) {
		nodes.forEach((node, index) => {
			if (typeof node !== "string") {
				executeAnyChildScripts(node);
				if (node instanceof HTMLScriptElement) {
					node = arguments[index] = executeScriptInReframedContext(node);
				}
			}
		});
		return _Element__replaceChildren.apply(this, arguments as any) as any;
	};

	Element.prototype.replaceWith = function replaceWith(...nodes) {
		nodes.forEach((node, index) => {
			if (typeof node !== "string") {
				executeAnyChildScripts(node);
				if (node instanceof HTMLScriptElement) {
					node = arguments[index] = executeScriptInReframedContext(node);
				}
			}
		});
		return _Element__replaceWith.apply(this, arguments as any) as any;
	};

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
	 */
	const iframeHistoryPrototype = Object.getPrototypeOf(iframeWindow.history);
	const mainWindowHistoryPrototype = Object.getPrototypeOf(mainWindow.history);

	type HistoryFns = History[
		| "pushState"
		| "replaceState"
		| "back"
		| "forward"
		| "go"];

	const originalHistoryFns = {
		iframe: new Map<keyof History, HistoryFns>(),
		mainWindow: new Map<keyof History, HistoryFns>(),
	};

	const historyMethods: (keyof History)[] = [
		"pushState",
		"replaceState",
		"back",
		"forward",
		"go",
	];

	historyMethods.forEach((prop) => {
		originalHistoryFns.iframe.set(prop, iframeHistoryPrototype[prop]);
		originalHistoryFns.mainWindow.set(prop, mainWindowHistoryPrototype[prop]);

		patchHistoryMethod(iframeWindow, mainWindow, prop);
		patchHistoryMethod(mainWindow, iframeWindow, prop);
	});

	function patchHistoryMethod(
		src: Window,
		target: Window,
		prop: keyof History
	) {
		Object.defineProperty(Object.getPrototypeOf(src.history), prop, {
			// TODO: come up with a better workaround that a no-op setter that doesn't break Qwik.
			// QwikCity tries to monkey-patch `pushState` and `replaceState` which results in a runtime error:
			//   TypeError: Cannot set property pushState of #<History> which only has a getter
			// https://github.com/QwikDev/qwik/blob/3c5e5a7614c3f64cbf89f1304dd59609053eddf0/packages/qwik-city/runtime/src/spa-init.ts#L127-L135
			set: () => {},
			get: () => {
				return function reframedHistoryGetter() {
					interceptAndReplayHistoryMethod(prop, target, ...arguments);
				};
			},
		});
	}

	function interceptAndReplayHistoryMethod(
		prop: keyof History,
		target: Window,
		...args: IArguments[]
	) {
		// TODO: remove this console.log once history patch is stabilized
		// For now, keep the log so that it's easy to see which history methods are intercepted
		console.log(
			`Intercepting ${prop} from ${target === mainWindow ? "iframe" : "main window"} and replaying to ${target === mainWindow ? "main window" : "iframe"}`
		);

		// All history methods should replace the state in the iframe since the iframe and the main window share a joint history session
		// Proxy all history methods to the main window instead so that the browser URL is updated only once
		Reflect.apply(
			originalHistoryFns.iframe.get("replaceState")!,
			iframeWindow.history,
			args as Parameters<History["pushState"]>
		);

		Reflect.apply(
			originalHistoryFns.mainWindow.get(prop)!,
			mainWindow.history,
			args
		);

		// Dispatch a popstate event to the target window (i.e if we call history.pushState() from iframe, we need to dispatch popstate event to window).
		// This is because react-router does not directly listen to window.history, but actually a history (npm package) instance
		// and subscribes to the "popstate" event to update the UI on history state changes.
		target.dispatchEvent(new PopStateEvent("popstate"));
	}

	const forwardPopstateEventToIframe = () => {
		Reflect.apply(
			originalHistoryFns.iframe.get("replaceState")!,
			iframeWindow.history,
			[mainWindow.history.state, null, mainWindow.location.href]
		);
		iframeWindow.dispatchEvent(new PopStateEvent("popstate"));
	};

	mainWindow.addEventListener("popstate", forwardPopstateEventToIframe);

	["length", "scrollRestoration", "state"].forEach((prop) => {
		Object.defineProperty(Object.getPrototypeOf(iframeWindow.history), prop, {
			get: () => {
				return Reflect.get(mainWindow.history, prop);
			},
		});
	});

	/**
	 * TODO:
	 * We need a better way to handle removing event listeners applied to the main window when the iframe is destroyed.
	 * For now, return a function that the fragment-host can call in its disconnectedCallback();
	 *
	 * Maybe create a MutationObserver instead and watch for the iframe node removal?
	 */
	const restoreParentWindowHistory = () => {
		mainWindow.removeEventListener("popstate", forwardPopstateEventToIframe);

		// Restore all the history patches we made to main window.history
		historyMethods.forEach((method) => {
			Object.defineProperty(Object.getPrototypeOf(mainWindow.history), method, {
				get: () => {
					return function restoreHistoryGetter() {
						Reflect.apply(
							originalHistoryFns.mainWindow.get(method)!,
							mainWindow.history,
							arguments
						);
					};
				},
			});
		});
	};

	return restoreParentWindowHistory;
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
};

const reframedMetadataSymbol = Symbol("reframedMetadata");

type ReframedShadowRoot = ShadowRoot & {
	[reframedMetadataSymbol]: ReframedMetadata;
};

type ReframedContainer = HTMLElement & {
	shadowRoot: ReframedShadowRoot;
};
