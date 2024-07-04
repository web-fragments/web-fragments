export { registerFragmentOutlet } from './fragment-outlet';

export { FragmentHost } from './fragment-host/fragment-host';
export { getFragmentHost } from './fragment-host/get-fragment-host';
// import piercingFragmentHostInlineScriptRaw from '../dist/fragment-host-inline-script.js?raw';
// @ts-ignore
// import piercingFragmentHostInlineScriptRaw from '../dist/fragment-host-inline-script.js?raw';
// const piercingFragmentHostInlineScriptRaw = `
// var l = Object.defineProperty;
// var a = (n, t, e) => t in n ? l(n, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : n[t] = e;
// var r = (n, t, e) => (a(n, typeof t != "symbol" ? t + "" : t, e), e);
// class o extends HTMLElement {
//   constructor() {
//     super(...arguments);
//     r(this, "cleanup", !0);
//     r(this, "stylesEmbeddingObserver");
//     r(this, "cleanUpHandlers", []);
//     r(this, "fragmentId");
//   }
//   connectedCallback() {
//     const e = this.getAttribute("fragment-id");
//     if (!e)
//       throw new Error(
//         "The fragment outlet component has been applied without providing a fragment-id"
//       );
//     this.fragmentId = e, this.fragmentIsPierced || this.setStylesEmbeddingObserver();
//   }
//   disconnectedCallback() {
//     if (this.cleanup) {
//       for (const e of this.cleanUpHandlers)
//         e();
//       this.cleanUpHandlers = [];
//     }
//   }
//   pierceInto(e) {
//     const s = this.contains(document.activeElement) ? document.activeElement : null;
//     this.cleanup = !1, e.appendChild(this), this.cleanup = !0, s == null || s.focus(), this.removeStylesEmbeddingObserver();
//   }
//   onCleanup(e) {
//     this.cleanUpHandlers.push(e);
//   }
//   get fragmentIsPierced() {
//     return this.parentElement.piercingFragmentOutlet;
//   }
//   setStylesEmbeddingObserver() {
//     this.stylesEmbeddingObserver = new MutationObserver((e) => {
//       e.some((d) => {
//         for (const i of d.addedNodes)
//           if (i.nodeType === Node.ELEMENT_NODE)
//             return !0;
//         return !1;
//       }) && this.embedStyles();
//     }), this.stylesEmbeddingObserver.observe(this, {
//       childList: !0,
//       subtree: !0
//     });
//   }
//   removeStylesEmbeddingObserver() {
//     var e;
//     (e = this.stylesEmbeddingObserver) == null || e.disconnect(), this.stylesEmbeddingObserver = void 0;
//   }
//   embedStyles() {
//     this.querySelectorAll(
//       'link[href][rel="stylesheet"]'
//     ).forEach((e) => {
//       if (e.sheet) {
//         let s = "";
//         for (const { cssText: i } of e.sheet.cssRules)
//           s += i + ``;
//         const d = document.createElement("style");
//         d.textContent = s, e.replaceWith(d);
//       }
//     });
//   }
// }
// window.customElements.define("fragment-host", o);

// `;
// export const piercingFragmentHostInlineScript = `<script>(() => {${piercingFragmentHostInlineScriptRaw}})();</script>`;

export { PiercingGateway } from './fragment-gateway';
export type { FragmentConfig } from './fragment-gateway';
