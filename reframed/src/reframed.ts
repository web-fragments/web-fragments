import WritableDOMStream from "writable-dom";

/**
 *
 * @param reframedSrc url of an http endpoint that will generate html stream to be reframed.
 * @param containerTagName tag name of the HTMLElement that will be created and used as the target container.
 *    The default is [`article`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article).
 * @returns
 */
export function reframed(reframedSrc: string, containerTagName: string = "article"): HTMLElement {
  // create the reframed container
  const reframedContainer = document.createElement(containerTagName);

  // kick off reframing but don't wait for it
  reframe(reframedSrc, reframedContainer);

  return reframedContainer;
}

async function reframe(reframedSrc: string, reframedContainer: HTMLElement) {
  console.debug("reframing!", { source: reframedSrc, targetContainer: reframedContainer.outerHTML });

  const reframedHtmlResponse = await fetch(reframedSrc);
  const reframedHtmlStream =
    reframedHtmlResponse.status === 200
      ? await reframedHtmlResponse.body!
      : stringToStream(
          `error fetching ${reframedSrc} (HTTP Status = ${
            reframedHtmlResponse.status
          })<hr>${await reframedHtmlResponse.text()}`
        );

  // create a hidden iframe and use it isolate JavaScript scripts
  const iframe = document.createElement("iframe");
  iframe.name = reframedSrc;
  iframe.hidden = true;
  iframe.addEventListener("load", () => {
    const iframeDocument = iframe.contentDocument;
    assert(iframeDocument !== null, "iframe.contentDocument is defined");

    monkeyPatchIFrameDocument(iframeDocument, reframedContainer);

    reframedHtmlStream
      .pipeThrough(new TextDecoderStream())
      .pipeTo(new WritableDOMStream(reframedContainer, { scriptLoadingDocument: iframeDocument }))
      .finally(() => {
        console.log("reframing done!", {
          source: reframedSrc,
          targetContainer: reframedContainer,
          title: iframeDocument.defaultView!.document.title,
        });
      });
  });

  // append iframe to the document to activate loading it
  document.body.insertAdjacentElement("beforeend", iframe);
}

/**
 * Apply monkey-patches to the source iframe so that we trick code running in it to behave as if it
 * was running in the main frame.
 */
function monkeyPatchIFrameDocument(iframeDocument: Document, reframedContainer: HTMLElement): void {
  const iframeDocumentPrototype = Object.getPrototypeOf(Object.getPrototypeOf(iframeDocument));
  const mainDocument = reframedContainer.ownerDocument;
  const mainDocumentPrototype = Object.getPrototypeOf(Object.getPrototypeOf(mainDocument));
  let updatedIframeTitle: string | undefined = undefined;

  Object.defineProperties(iframeDocumentPrototype, {
    title: {
      get: function () {
        return (
          updatedIframeTitle ??
          // https://html.spec.whatwg.org/multipage/dom.html#document.title
          reframedContainer.getElementsByTagName("title")[0]?.textContent?.trim() ??
          "[reframed document]"
        );
      },
      set: function (newTitle: string) {
        debugger;
        updatedIframeTitle = newTitle;
      },
    },

    // redirect getElementById to be a scoped reframedContainer.querySelector query
    getElementById: {
      value(id: string) {
        return reframedContainer.querySelector(`#${id}`);
      },
    },

    // redirect getElementByName to be a scoped reframedContainer.querySelector query
    getElementByName: {
      value(name: string) {
        return reframedContainer.querySelector(`[name="${name}"]`);
      },
    },

    // redirect querySelector to be a scoped reframedContainer.querySelector query
    querySelector: {
      value(selector: string) {
        return reframedContainer.querySelector(selector);
      },
    },

    // redirect to mainDocument
    activeElement: {
      get: () => {
        return mainDocument.activeElement;
      },
    },

    // redirect to mainDocument
    head: {
      get: () => {
        // TODO should we enforce that there is a HEAD-like element under reframedContainer?
        return reframedContainer;
      },
    },

    body: {
      get: () => {
        // TODO should we enforce that there is a BODY-like element under reframedContainer?
        return reframedContainer;
      }
    },

    stylesheets: {
      get: () => {
        // TODO: use shadow root's sheets instead
        return mainDocument.styleSheets;
      },
    }
  });

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
        return (reframedContainer[queryProperty]).apply(reframedContainer, arguments);
      }
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
