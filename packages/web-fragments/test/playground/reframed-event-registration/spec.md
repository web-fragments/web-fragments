# Event listener registration and event propagation in Web Fragments

The event registration and propagation in Web Fragment's reframed context aims to emulate the standard browser behavior as closely as possible.

## Overview of the Web Fragment event system virtualization

The Web Fragment event system virtualization is based on a few key characteristics:

- all listeners, including `window`, `document`, `<html>`, and `<body>` are always registered within the shadow root of the fragment (using `shadowRoot`, `<wf-document>`, `<wf-html>`, and `<wf-body>` elements), this ensures that
  - all events are observable by capturing and bubbling listeners
  - shadow root DOM event retargeting doesn't mess with the events
- listeners targeting `window`, `document`, `<html>`, and `<body>` have an additional retargeting proxy listener registered on the main `window`, `document`, `<html>`, and `<body>` element with the same registration options as the original
  - if an event is received by this retargeting proxy listener, if and only if the event targets one of `window`, `document`, `<html>`, or `<body>`, the listener should call the original listener registered by the fragment application, while patching the event to look like it was received on the event target of the registration
- since listeners registered on `window` and `document` need to be called in the right order by events flowing through the shadowRoot during the capture or bubble phase, we introduced a new element `<wf-document>` which sole purpose is to act as an event target for the listeners targeting the document object, leaving the `shadowRoot` object available as the event target for listeners originally targeting the `window` object

<!-- prettier-ignore -->
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
              |     |                               <wf-html>
              |     |                                   ^ register native listener + retargeting proxy listener
              ﹂-------------------------------------------------------------------------ꜚ
                    |                                   <wf-head></wf-head>
                    |                                        ^ register native listener
                    |                                   <wf-body>
                    |                                        ^ register native listener + retargeting proxy listener
                    ﹂------------------------------------------------------------------------ꜚ
                                                            <some elements within a fragment...>
                                                                ^ events registered here don't need any special handling

Depending on the event type, event target, and target of the listener registration, the following needs to be done to achieve the goal of emulating the browser behavior:

- [x] if a listener is registered on any element within the fragment's `<body>` element, there is no need to do anything special, standard browser behavior is achieved

- [x] if a listener is registered on `<body>`

  - [x] register a native listener on `<wf-body>` (passing along all the registration options) — this ensures that any capturing or bubbling events dispatched within the fragment pass through the listener
  - [x] register a special retargeting proxy listener (described below) on main `<body>`

- [x] if a listener is registered on `<html>`

  - [x] register a native listener on `<wf-html>` (passing along all the registration options) — this ensures that any capturing or bubbling events dispatched within the fragment pass through the listener
  - [x] register a special retargeting proxy listener (described below), on main `<html>`

- [x] if a listener is registered on `document`

  - [x] register a native listener on `<wf-document>` (passing along all the registration options) — this ensures that any capturing or bubbling events dispatched within the fragment pass through the listener
  - [x] register a special retargeting proxy listener (described below), on main `document`

- [x] if a listener is registered on `window`

  - [x] if the `eventType` is `load`, `unload`, `onbeforeunload`, or `popstate` register the listener on `iframeWindow`
  - [x] register a native listener on web-fragment-host's `shadowRoot` (passing along all the registration options) — this ensures that any capturing or bubbling events dispatched within the fragment pass through the listener
  - [x] register a special retargeting proxy listener (described below), on main `window`

- [x] for all listener wrappers or retargeting proxy listeners, ensure that listener unregistration works correctly for both capturing and bubbling listeners

## Retargeting proxy listeners for Window, Document, `<html>`, `<body>` targets

Special retargeting proxy listener should work as follows:

- [x] register a new listener on one of the main `window`, `document`, `<html>`, or `<body` elements as follows:

  - [x] passing along all the original registration options
  - [x] add splice in an abort signal so that the listener is removed when the fragment is destroyed (otherwise we'd leak memory!)
  - [x] the listener should behave as follows

    - [x] ignore any events that don't target one of `window`, `document`, `<html>`, or `<body` — these events will either not make it into the fragment and thus the fragment should not know about them, or will target an element within the fragment, and the listener registered on the `shadowRoot` or `<wf-*>` elements will handle them
    - [x] otherwise patch the event object by overwriting the `currentTarget`, `target`, `composedPath`, and in case of `UIEvent` instances also the `view` property
    - [x] call the original listener registered by the fragment application with the patched event
    - [x] after the listener is invoked, restore the event object to the original shape from before we patched it

## `document.activeElement` handling

`document.activeElement` requires the following custom handling to work correctly:

- [x] if the currently active element is within the `shadowRoot`, `activeElement` should point to it
- [x] if the currently active element is outside of the `shadowRoot`, `activeElement` should return fragment's `<body>` element (a.k.a `<wf-body>`)
- [x] if the parent's active element is `null` (for example if the focus is on an element in a iframe (non-reframed iframe)), `activeElement` should return `null`

## Misc known facts and notes about DOM event system

- `click`, `keypress`, and related events can end up targeting the `<body>` element as this element often acts as the fallback target when no more specific target is available
- `load` and `error` events from scripts and stylesheets can be captured on `<head>` element, but do not bubble back up
- all listeners must be registered with the fragment's `shadowRoot` (or on the `shadowRoot`), because some events are not observable from the outside of the root boundary (for example the `mouseenter`, `mouseleave`, `pointerenter`, etc)
- an instance of a listener function can be registered only once for a given event type and phase (bubbling/capture), subsequent re-registrations are ignored
- to unregister a listener, the full options object is unnecessary, the capture/bubble boolean is sufficient
