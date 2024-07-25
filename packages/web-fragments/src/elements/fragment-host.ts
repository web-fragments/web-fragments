import { reframed } from "reframed";

export class FragmentHost extends HTMLElement {
	iframe: HTMLIFrameElement | undefined;
	ready: Promise<() => void> | undefined;
	isInitialized = false;
	isPortaling = false;

	constructor() {
		super();
		this.handlePiercing = this.handlePiercing.bind(this);
	}

	async connectedCallback() {
		/**
		 * Because we move the entire fragment host to the fragment outlet,
		 * we don't need to run this connectedCallback again. Only run once the first time the element is added to the document.
		 */
		if (!this.isInitialized) {
			this.isInitialized = true;

			const { iframe, ready } = reframed(
				this.shadowRoot ?? document.location.href,
				{
					container: this,
				}
			);

			this.iframe = iframe;
			this.ready = ready;

			/**
			 * <fragment-outlet> will dispatch the fragment-outlet-ready event.
			 * When that happens, move the entire host element + shadowRoot into the fragment-outlet
			 */
			document.addEventListener("fragment-outlet-ready", this.handlePiercing, {
				once: true,
			});
		}
	}

	async disconnectedCallback() {
		if (this.isPortaling) {
			this.isPortaling = false;
			return;
		}

		if (this.iframe && !this.isPortaling) {
			this.iframe.remove();
			this.iframe = undefined;

			// TODO: Figure out a better way to handle restoring side effects from calling reframed()
			// It feels wrong for the fragment-host to handle this in the disconnected callback
			if (this.ready) {
				const restoreMonkeyPatchSideEffects = await this.ready;
				restoreMonkeyPatchSideEffects();
			}

			document.removeEventListener(
				"fragment-outlet-ready",
				this.handlePiercing
			);
		}
	}

	async handlePiercing(event: Event) {
		// Call preventDefault() to signal the fragment-outlet that
		// we will pierce this fragment-host into it, so it shouldn't render its own.
		event.preventDefault();

		// Wait until reframed() has signaled that the new iframe context is ready.
		await this.ready;

		// Any script tags injected into the <fragment-host> via reframe have already been made inert through writeable-dom.
		// We need to do the same when we move <fragment-host> into <fragment-outlet>
		this.neutralizeScriptTags();

		// Preserve the existing stylesheets to avoid a FOUC when reinserting this element into the DOM
		this.preserveStylesheets();

		const activeElement = this.shadowRoot?.activeElement;
		const selectionRange = this.getSelectionRange();

		// Move <fragment-host> into <fragment-outlet> and set a flag to return early in the disconnectedCallback
		this.isPortaling = true;
		const targetElement = event.target as HTMLElement;
		targetElement.replaceChildren(this);

		// Restore focus to any element that was previously focused inside the shadow root
		if (activeElement) {
			(activeElement as HTMLElement).focus();
		}

		if (selectionRange) {
			this.setSelectionRange(selectionRange);
		}

		// Restore the initial type attributes of the script tags
		this.restoreScriptTags();
		this.removeAttribute("data-piercing");
	}

	preserveStylesheets() {
		if (this.shadowRoot) {
			this.shadowRoot.adoptedStyleSheets = Array.from(
				this.shadowRoot.styleSheets,
				(sheet) => {
					const clone = new CSSStyleSheet();
					[...sheet.cssRules].forEach((rule) => clone.insertRule(rule.cssText));
					return clone;
				}
			);
		}
	}

	neutralizeScriptTags() {
		const scripts = [...this.shadowRoot!.querySelectorAll("script")];
		scripts.forEach((script) => {
			const type = script.getAttribute("type");
			type && script.setAttribute("data-script-type", type);
			script.setAttribute("type", "inert");
		});
	}

	restoreScriptTags() {
		const scripts = [...this.shadowRoot!.querySelectorAll("script")];
		scripts.forEach((script) => {
			script.removeAttribute("type");
			const originalType = script.getAttribute("data-script-type");
			originalType && script.setAttribute("type", originalType);
			script.removeAttribute("data-script-type");
		});
	}

	// Make a best-effort attempt at capturing selection state.
	// Note that ShadowRoot.getSelection() is only supported in Chromium browsers.
	// Also, Selection.getRangeAt() has unspecified behavior for selections that
	// span across shadow root boundaries. We can utilize
	// https://developer.mozilla.org/en-US/docs/Web/API/Selection/getComposedRanges
	// to help with this once it gets more browser support.
	getSelectionRange() {
		try {
			return (this.shadowRoot as unknown as Document)
				.getSelection()
				?.getRangeAt(0);
		} catch {
			return null;
		}
	}

	setSelectionRange(range: Range) {
		try {
			const selection = (this.shadowRoot as unknown as Document).getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
		} catch {}
	}
}
