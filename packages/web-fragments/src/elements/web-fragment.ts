import { assert } from './reframed/utils/assert';
import { type WebFragmentHost } from './web-fragment-host';

/**
 * The web component that is used to render a web fragment.
 */
export class WebFragment extends HTMLElement {
	async connectedCallback() {
		const fragmentId = this.getAttribute('fragment-id');
		const fragmentSrc = this.getAttribute('src');
		let settledFragmentHost = null;

		if (!fragmentId) {
			throw new Error('The <web-fragment> is missing fragment-id attribute!');
		}

		if (this.shadowRoot) {
			assert(this.shadowRoot.firstElementChild !== null, `<web-fragment> contains a shadowroot but no children!`);
			assert(
				this.shadowRoot.firstElementChild.getAttribute('fragment-id') === fragmentId,
				`<web-fragment> contains a <web-fragment-host> with mismatched fragment-id!`,
			);
			settledFragmentHost = this.shadowRoot.firstElementChild;
		} else {
			this.attachShadow({ mode: 'open' });
		}

		// Since fragments will most likely contain other block elements, they should be blocks themselves by default
		const blockSheet = new CSSStyleSheet();
		blockSheet.insertRule(':host { display: block; }');
		this.shadowRoot?.adoptedStyleSheets.push(blockSheet);

		if (settledFragmentHost) {
			return;
		}

		const piercedWebFragmentHost = document.querySelector(
			`web-fragment-host[fragment-id="${fragmentId}"]`,
		) as WebFragmentHost;
		if (piercedWebFragmentHost) {
			piercedWebFragmentHost.portalHost(this.shadowRoot!);
		} else {
			// There is no <web-fragment-host> element in the document that could be adopted into this <web-fragment>.
			// Instantiate a new <web-fragment-host> element to fetch the fragment
			const fragmentHost = document.createElement('web-fragment-host');
			fragmentHost.setAttribute('fragment-id', fragmentId);
			if (fragmentSrc) {
				fragmentHost.setAttribute('src', fragmentSrc);
			}
			this.shadowRoot?.appendChild(fragmentHost);
		}
	}
}
