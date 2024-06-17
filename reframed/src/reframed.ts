import WritableDOMStream from "writable-dom";

export async function reframed(reframedSrc: string, containerTagName: string): Promise<HTMLElement> {
  console.log("reframing! source:", reframedSrc, "target container: ", containerTagName);

  const reframedHtmlResponse = await fetch(reframedSrc);
  const reframedHtmlStream =
    reframedHtmlResponse.status === 200
      ? await reframedHtmlResponse.body!
      : stringToStream(`error fetching ${reframedSrc} (HTTP Status = ${reframedHtmlResponse.status})`);

  // create the reframed container
  const reframedContainer = document.createElement(containerTagName);

  // create a hidden iframe and pipe contents to it
  const iframe = document.createElement("iframe");
  iframe.name = reframedSrc;
  iframe.hidden = true;
  iframe.addEventListener("load", () => {
    const iframeDocument = iframe.contentDocument!;

    reframedHtmlStream
      .pipeThrough(new TextDecoderStream())
      .pipeTo(new WritableDOMStream(iframeDocument.body))
      .finally(() => {
        reframedContainer.innerHTML = iframeDocument.body.innerHTML;
        iframeDocument.body.innerHTML = "";

        iframeDocument.getElementById = function reframedGetElementById(id: string) {
          return reframedContainer.querySelector(`#${id}`);
        };

        console.log("reframing done!");
      });
  });
  document.body.appendChild(iframe);

  return reframedContainer;
}

const stringToStream = (str: string): ReadableStream => {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(str));
      controller.close();
    },
  });
};
