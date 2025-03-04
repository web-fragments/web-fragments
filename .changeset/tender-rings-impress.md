---
'web-fragments': patch
'reframed': patch
'@onwidget/astrowind': patch
---

Because the main document can only have one html, head, and body element on the page, the browser will omit extra instances of those elements within the shadowRoot.

Instead, a valid Document structure within the shadowRoot is provided via "fake" custom container elements injected by the gateway: wf-html, wf-head, and wf-body

Application code that targets document.documentElement, document.body, and document.head should reference these custom container elements.

Any CSS selectors used in document.querySelector and document.querySelectorAll are rewritten to selectively target these custom container elements as well.

For example, `document.querySelector('html body.head')` will be rewritten to `document.querySelector('wf-html wf-body.head)`.
