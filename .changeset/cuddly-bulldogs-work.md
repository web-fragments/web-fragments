---
'web-fragments': patch
---

fix(reframed): make browser API patching more resilient to defend against browser extensions

Some browser extensions incorrectly patch browser APIs in ways that prevent Web Fragments from working correctly.

The most recent offender is Dashlane password manager (https://www.dashlane.com/), which patches the `hasInstance` property of global constructors with non-configurable descriptors, which prevents further patching by WebFragments.

To defend against such issues, WebFragments now catches patching errors, issues a warning including the error details, and continues patching the remaining APIs.

It's likely that many applications will work just fine even with a few browser APIs unpatched, so this approach is preferable to fatal errors that crash the apps.

Example warning:

```
WebFragments: failed to patch `PublicKeyCredential[Symbol.hasInstance]`
A browser extension might be interfering with the browser APIs...
Some application functionality may not work as expected!
Error: TypeError: Cannot redefine property: Symbol(Symbol.hasInstance)
    at Object.defineProperty (<anonymous>)
    at cf-fragments.4eb1694958c0444acce6.js:533:48
    at Array.forEach (<anonymous>)
    at cf-fragments.4eb1694958c0444acce6.js:531:174
    at HTMLIFrameElement.<anonymous> (cf-fragments.4eb1694958c0444acce6.js:895:34)
Descriptor: {value: Proxy(Function), writable: false, enumerable: false, configurable: false}
```
