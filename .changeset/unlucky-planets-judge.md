---
'web-fragments': minor
---

fix: event system virtualization

The current implementation is however overly simplistic and suffers from many flaws which break applications running in Web Fragments:

- [x] listeners registered on `body` in a fragment are registered on `<wf-body>` which observes clicks within the body, but doesn't receive any events that are emitted by the browser on the real `<body>` element, for example `keypress` events (when no element is selected/focused)
- [x] similarly, listeners registered on the `html` element are registered on `<wf-html>` element, and don't receive events triggered on the main `<html>` element, such as `blur` event
- [x] listeners registered on `document` object are registered on the `shadowRoot` and don't receive events dispatched on the main `document`
- [x] listeners registered on `window` object are registered on the main `window`, and while they do receive events that target the window, they don't reliably receive events that capture or bubble through the window because some events are not observable from outside of the shadow root boundary, or because the `target` of the event is `<web-fragment>` element as the outermost host of the shadow roots wrapping the fragment
  - [x] additional main context objects are exposed via the unpatched event object's properties, like `currentTarget`, `view`, etc
- [x] `document.activeElement` doesn't properly point to an active element, if the element is main `body`, which is often used as the fallback element

All these problems, result in fragment's with complex event listener registration usage to behave unreliably.

## Overview of the Web Fragment event system virtualization

The Web Fragment event system virtualization is based on a few key characteristics:

- all listeners, including `window`, `document`, `<html>`, and `<body>` are always registered within the shadow root of the fragment (using `shadowRoot`, `<wf-document>`, `<wf-html>`, and `<wf-body>` elements), this ensures that
  - all events are observable by capturing and bubbling listeners
  - shadow root DOM event retargeting doesn't mess with the events
- listeners targeting `window`, `document`, `<html>`, and `<body>` have an additional retargeting proxy listener registered on the main `window`, `document`, `<html>`, and `<body>` element with the same registration options as the original
  - if an event is received by this retargeting proxy listener, if and only if the event targets one of `window`, `document`, `<html>`, or `<body>`, the listener should call the original listener registered by the fragment application, while patching the event to look like it was received on the event target of the registration
- since listeners registered on `window` and `document` need to be called in the right order by events flowing through the shadowRoot during the capture or bubble phase, we introduced a new element `<wf-document>` which sole purpose is to act as an event target for the listeners targeting the document object, leaving the `shadowRoot` object available as the event target for listeners originally targeting the `window` object

<!-- prettier-ignore -->
```
[Main Window]
  ^   [Main Document]
  |     ^   <html>  
  |     |     ^   <head></head>
  |     |     |   <body>
  |     |     |     ^   <some app-shell elements...>
  |     |     |     |         <web-fragment>
  |     |     |     |             <!-- shadowRoot -->
  |     |     |     |                 <web-fragment-host>
  |     |     |     |                       <!-- shadowRoot -->
  |     |     |     |                           ^ window: register native listener + retargeting proxy listener
  ﹂------------------------------------------------------------------------------------------------------------------ꜚ
        |     |     |                           <wf-document>
        |     |     |                             ^ document: register native listener on shadowRoot + retargeting proxy listener
        ﹂------------------------------------------------------------------------------------------------ꜚ
              |     |                           <wf-html>
              |     |                               ^ register native listener + retargeting proxy listener
              ﹂---------------------------------------------------------------------ꜚ
                    |                                 <wf-head></wf-head>
                    |                                    ^ register native listener
                    |                                 <wf-body>
                    |                                    ^ register native listener + retargeting proxy listener
                    ﹂---------------------------------------------------------------------ꜚ
                                                            <some elements within a fragment...>
                                                                ^ events registered here don't need any special handling
```
