import { reframed } from './reframed/reframed';

export class WebFragmentHost extends HTMLElement {
	#iframe: HTMLIFrameElement | undefined;
	#ready: Promise<void> | undefined;
	isInitialized = false;
	isPortaling = false;

	async connectedCallback() {
		/**
		 * Because we move the entire fragment host to the web fragment,
		 * we don't need to run this connectedCallback again. Only run once the first time the element is added to the document.
		 */
		if (!this.isInitialized) {
			this.isInitialized = true;

			const fragmentId = this.getAttribute('fragment-id');
			const fragmentSrc = this.getAttribute('src') ? this.getAttribute('src') : null;
			const locationSrc = location.pathname + location.search;

			if (!fragmentId) {
				throw new Error('The <web-fragment-host> is missing fragment-id attribute!');
			}

			const pierced = this.shadowRoot !== null;

			/**
			 * The main purpose of wfDocumentElement is to act as a dedicated EventTarget within the DOM tree for all listeners that were meant to be registered on a Document object.
			 */
			let wfDocumentElement: HTMLElement;
			let reframedShadowRoot: ShadowRoot;

			if (!pierced) {
				wfDocumentElement = document.createElement('wf-document');
				reframedShadowRoot = this.attachShadow({ mode: 'open' });
				reframedShadowRoot.appendChild(wfDocumentElement);
			} else {
				reframedShadowRoot = this.shadowRoot;
				wfDocumentElement = reframedShadowRoot.querySelector('wf-document')!;

				if (!wfDocumentElement) {
					throw new Error(`Can't find <wf-document> in the shadow root of <web-fragment-host>!`);
				}
			}

			const { iframe, ready } = reframed(fragmentSrc ?? locationSrc, {
				pierced,
				shadowRoot: reframedShadowRoot,
				wfDocumentElement: wfDocumentElement,
				headers: {
					'X-Web-Fragment-Id': fragmentId,
					// TODO: rename to X-Web-Fragment-Mode
					'x-fragment-mode': 'embedded',
				},
				bound: !fragmentSrc,
				name: fragmentId,
			});

			this.#iframe = iframe;
			this.#ready = ready;
		}
	}

	async disconnectedCallback() {
		if (this.isPortaling) {
			this.isPortaling = false;
			return;
		}

		if (this.#iframe) {
			this.#iframe.remove();
			this.#iframe = undefined;
		}
	}

	async portalHost(targetShadowRoot: ShadowRoot) {
		// Wait until reframed() has signaled that the new iframe context is ready.
		await this.#ready;

		// Any script tags injected into the <web-fragment-host> via reframe have already been made inert through writeable-dom.
		// We need to do the same when we move <web-fragment-host> into <web-fragment> to avoid re-executing scripts.
		this.#neutralizeScriptTags();

		// Preserve the existing stylesheets to avoid a FOUC when reinserting this element into the DOM
		this.#preserveStylesheets();

		const activeElement = this.shadowRoot?.activeElement;
		const selectionRange = this.#getSelectionRange();

		// Move <web-fragment-host> into <web-fragment> and set a flag to return early in the disconnectedCallback
		this.isPortaling = true;
		targetShadowRoot.replaceChildren(this);

		// Restore focus to any element that was previously focused inside the shadow root
		if (activeElement) {
			(activeElement as HTMLElement).focus();
		}

		if (selectionRange) {
			this.#setSelectionRange(selectionRange);
		}

		// Restore the initial type attributes of the script tags
		this.#restoreScriptTags();
		this.removeAttribute('data-piercing');
	}

	// A best-effort attempt at avoiding a FOUC.
	//
	// Teleporting the web-fragment-host into the web-fragment requires removing then re-inserting the node from the document,
	// which causes the browser to perform all of the steps for node removal and insertion respectively,
	// namely unloading styles and (potentially asynchronously) reloading them. We can mostly mitigate the FOUC
	// by copying all of the loaded style rules into Constructed Stylesheets and attaching them to the shadow root
	// so they're synchronously available.
	//
	// There are major caveats with with this approach, however. Constructed Stylesheets don't allow `@import` rules,
	// and cross-origin imported stylesheets don't allow introspection of their CSS rules, so these aren't copyable.
	// Secondly, `adoptedStylesheets` take precedence over normal stylesheets so we have the potential to overshadow
	// style rules that get added after we've preserved the existing styles.
	//
	// Until we have the ability to perform atomic move operations in the DOM (https://github.com/whatwg/dom/issues/1255)
	// this is probably the best way we can deal with the FOUC.
	#preserveStylesheets() {
		if (this.shadowRoot) {
			this.shadowRoot.adoptedStyleSheets = Array.from(this.shadowRoot.styleSheets, (sheet) => {
				const clone = new CSSStyleSheet({ media: sheet.media.mediaText, disabled: sheet.disabled });

				try {
					// CSSStyleSheet.insertRule() prepends CSS rules to the top of the stylesheet by default.
					// We need to set the index to sheet.cssRules.length in order to append the rule and maintain specificity.
					[...sheet.cssRules].forEach((rule) => {
						// @import directives are not allowed in Constructed Stylesheets
						if (!(rule instanceof CSSImportRule)) {
							clone.insertRule(rule.cssText, clone.cssRules.length);
						}
					});
				} catch (e: any) {
					// let's log if this is not a security error
					// security error is usually cors related errors — most likely due to 3rd party fonts
					// see: https://stackoverflow.com/questions/49993633/uncaught-domexception-failed-to-read-the-cssrules-property
					if (e.name !== 'SecurityError') {
						console.debug(e);
					}
				}
				return clone;
			});
		}
	}

	#neutralizeScriptTags() {
		const scripts = [...this.shadowRoot!.querySelectorAll('script')];
		scripts.forEach((script) => {
			const type = script.getAttribute('type');
			type && script.setAttribute('data-script-type', type);
			script.setAttribute('type', 'inert');
		});
	}

	#restoreScriptTags() {
		const scripts = [...this.shadowRoot!.querySelectorAll('script')];
		scripts.forEach((script) => {
			script.removeAttribute('type');
			const originalType = script.getAttribute('data-script-type');
			originalType && script.setAttribute('type', originalType);
			script.removeAttribute('data-script-type');
		});
	}

	// Make a best-effort attempt at capturing selection state.
	// Note that ShadowRoot.getSelection() is only supported in Chromium browsers.
	// Also, Selection.getRangeAt() has unspecified behavior for selections that
	// span across shadow root boundaries. We can utilize
	// https://developer.mozilla.org/en-US/docs/Web/API/Selection/getComposedRanges
	// to help with this once it gets more browser support.
	#getSelectionRange() {
		try {
			return (this.shadowRoot as unknown as Document).getSelection()?.getRangeAt(0);
		} catch {
			return null;
		}
	}

	#setSelectionRange(range: Range) {
		try {
			const selection = (this.shadowRoot as unknown as Document).getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
		} catch {}
	}
}
