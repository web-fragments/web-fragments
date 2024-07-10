import WritableDOMStream from "writable-dom";

/**
 *
 * @param reframedSrcOrSourceShadowRoot url of an http endpoint that will generate html stream to be reframed, or a shadowRoot containing the html to reframe
 * @param containerTagName tag name of the HTMLElement that will be created and used as the target container.
 *    The default is [`article`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article).
 * @returns
 */
export function reframed(reframedSrcOrSourceShadowRoot: string|ShadowRoot, options: {container: HTMLElement} | { containerTagName: string} = { containerTagName: "article"}): {
  iframe: HTMLIFrameElement;
  container: HTMLElement;
  ready: Promise<void>;
} {
  // create the reframed container
  const reframedContainer = 'container' in options ? options.container : document.createElement(options.containerTagName);
  const reframedContainerShadowRoot = reframedContainer.shadowRoot ?? reframedContainer.attachShadow({mode: "open"});

  // create the iframe
  const iframe = document.createElement("iframe");

  // hide the iframe that we use to isolate JavaScript scripts
  iframe.hidden = true;

  let {promise: monkeyPatchPromise, resolve: resolveMonkeyPatchPromise} = Promise.withResolvers<void>();

  iframe.addEventListener("load", () => {
    const iframeDocument = iframe.contentDocument;
    assert(iframeDocument !== null, "iframe.contentDocument is defined");

    monkeyPatchIFrameDocument(iframeDocument, reframedContainerShadowRoot);
    resolveMonkeyPatchPromise();
  });

  let ready: Promise<void>;

  if(typeof reframedSrcOrSourceShadowRoot === 'string') {
    const reframedSrc = reframedSrcOrSourceShadowRoot;
    reframedContainer.setAttribute('reframed-src', reframedSrc);
    ready = reframeWithFetch(reframedSrcOrSourceShadowRoot, reframedContainer.shadowRoot as ParentNode, iframe);
  } else {
    ready = reframeFromTarget(reframedSrcOrSourceShadowRoot, iframe);
  }

  // Note: this line needs to be here as it needs to be added before all the reframing logic
  //       has added the various load event listeners
  document.body.insertAdjacentElement("beforeend", iframe);

  return {
    iframe,
    container: reframedContainer,
    ready: Promise.all([monkeyPatchPromise, ready]).then(() => {}),
  }
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

  iframe.name = reframedSrc;
  iframe.src = reframedSrc;

  const {promise, resolve} = Promise.withResolvers<void>()

  iframe.addEventListener("load", () => {
    reframedHtmlStream
      .pipeThrough(new TextDecoderStream())
      .pipeTo(
        new WritableDOMStream(target, {
          scriptLoadingDocument: document,
        })
      )
      .finally(() => {
        console.log("reframing done (reframeWithFetch)!", {
          source: reframedSrc,
          target,
          title: document.defaultView!.document.title,
        });
        resolve();
      });
  })

  return promise
}

async function reframeFromTarget(source: ParentNode, iframe: HTMLIFrameElement): Promise<void> {
  console.debug("reframing! (reframeFromTarget)", { source });

  iframe.src = document.location.href;

  const scripts = [...source.querySelectorAll('script')]

  const {promise, resolve} = Promise.withResolvers<void>()

  iframe.addEventListener("load", () => {
    scripts.forEach(script => {
      const scriptType = script.getAttribute('data-script-type');
      script.removeAttribute('data-script-type');
      script.removeAttribute('type')
      if (scriptType) {
        script.setAttribute('type', scriptType)
      }

      assert(!!(iframe.contentDocument && isReframedDocument(iframe.contentDocument)), 'iframe.contentDocument is not a reframed document');
      iframe.contentDocument.unreframedBody.appendChild(iframe.contentDocument.importNode(script, true));
    })

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
function monkeyPatchIFrameDocument(iframeDocument: Document, shadowRoot: ShadowRoot): void {
  const iframeDocumentPrototype = Object.getPrototypeOf(Object.getPrototypeOf(iframeDocument));
  const mainDocument = shadowRoot.ownerDocument;
  const mainDocumentPrototype = Object.getPrototypeOf(Object.getPrototypeOf(mainDocument));
  const mainWindow = mainDocument.defaultView!;
  const iframeWindow = iframeDocument.defaultView!;
  let updatedIframeTitle: string | undefined = undefined;

  const unpatchedIframeDocumentPrototypeProps = Object.getOwnPropertyDescriptors(iframeDocumentPrototype);
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
      }
    },

    // @ts-ignore -- TODO: hack
    unreframedBody: {
      get: () => {
        return unpatchedIframeBody;
      }
    },

    stylesheets: {
      get: () => {
        return shadowRoot.styleSheets;
      },
    },

    dispatchEvent: {
      value(event: Event) {
        return shadowRoot.dispatchEvent(event);
      }
    },

    childElementCount: {
      get() {
        return shadowRoot.childElementCount;
      }
    },

    hasChildNodes: {
      value(id: string) {
        return shadowRoot.hasChildNodes();
      },
    },

    children: {
      get() {
        return shadowRoot.children;
      }
    },

    firstElementChild: {
      get() {
        return shadowRoot.firstElementChild;
      }
    },

    firstChild: {
      get() {
        return shadowRoot.firstChild;
      }
    },

    lastElementChild: {
      get() {
        return shadowRoot.lastElementChild;
      }
    },

    lastChild: {
      get() {
        return shadowRoot.lastChild;
      }
    },

    rootElement: {
      get() {
        return shadowRoot.firstChild;
      }
    },
  } satisfies Record<keyof Document, any>);

  const domCreateProperties: (keyof Pick<Document,
    "createAttributeNS" |
    "createCDATASection" |
     "createComment" |
    "createDocumentFragment" |
     "createElement" |
    "createElementNS" |
    "createEvent" |
    "createExpression" |
    "createNSResolver" |
    "createNodeIterator" |
    "createProcessingInstruction"|
    "createRange"|
    "createTextNode"|
    "createTreeWalker"
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
        return (mainDocument[createProperty]).apply(mainDocument, arguments);
      }
    });
  }

  // methods to query for elements that can be retargeted into the reframedContainer
  const domQueryProperties: (keyof Pick<Document,
    "querySelector" |
    "querySelectorAll" |
     "getElementsByClassName" |
    "getElementsByTagName" |
     "getElementsByTagNameNS"
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
        return (shadowRoot[queryProperty]).apply(shadowRoot, arguments);
      }
    });
  }

  // methods to manage document listeners
  const domListenerProperties: (keyof Pick<Document,
    "addEventListener" |
    "removeEventListener"
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
      }
    });



// window.location is read-only and non-configurable, so we can't patch it
//
// additionally in a browsing context with one or more iframes, the history
// all frames contribute to the joint history: https://www.w3.org/TR/2011/WD-html5-20110525/history.html#joint-session-history
// this means that we need to be careful not to add duplicate entries to the
// history stack via pushState within the iframe as that would double the
// number of history entries that back/forward button would have to work through
//
// therefore we do the following:
// - intercept all history.pushState history.replaceState calls and replay
//   them in the main window
// - update the window.location within the iframe via history.replaceState
// - intercept window.addEventListener('popstate', ...) registration and forward it onto the main window
const originalHistoryFns = new Map();
["back", "forward", "go", "pushState", "replaceState"].forEach((prop) => {
  originalHistoryFns.set(prop, Object.getPrototypeOf(iframeWindow.history)[prop]);
  Object.defineProperty(Object.getPrototypeOf(iframeWindow.history), prop, {
    get: () => {
      return function reframedHistoryGetter() {
        console.log(
          prop,
          "history length",
          mainWindow.history.length,
          iframeWindow.history.length
        );

        switch (prop) {
          case "pushState": {
            Reflect.apply(
              originalHistoryFns.get("replaceState"),
              iframeWindow.history,
              arguments
            );
            const args = [...arguments] as Parameters<History['pushState']>;
            mainWindow.history.pushState(...args);
            break;
          }
          case "replaceState": {
            Reflect.apply(
              originalHistoryFns.get("replaceState"),
              iframeWindow.history,
              arguments
            );
            const args = [...arguments] as Parameters<History['replaceState']>;
            mainWindow.history.replaceState(...args);
            break;
          }
          default: {
            Reflect.apply(
              mainWindow.history[prop],
              mainWindow.history,
              arguments
            );
          }
        }
      };
    },
  });
});

// keep window.location and history.state in sync with the ones in the parent window
mainWindow.addEventListener("popstate", () => {
  Reflect.apply(originalHistoryFns.get("replaceState"), Object.getPrototypeOf(iframeWindow.history), [
    mainWindow.history.state,
    null,
    mainWindow.location.href,
  ]);
});

["length", "scrollRestoration", "state"].forEach((prop) => {
  Object.defineProperty(Object.getPrototypeOf(iframeWindow.history), prop, {
    get: () => {
      return Reflect.get(mainWindow.history, prop);
    },
  });
});
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
  unreframedBody: HTMLBodyElement;
}

function isReframedDocument(document: Document & { unreframedBody?: HTMLBodyElement }): document is ReframedDocument {
  return 'unreframedBody' in document;
}
