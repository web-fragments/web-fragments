/**
 * The web component that is used to render a web fragment.
 */
export class WebFragment extends HTMLElement {
	async connectedCallback() {
		const fragmentId = this.getAttribute('fragment-id');

		if (!fragmentId) {
			throw new Error('The <web-fragment> is missing fragment-id attribute!');
		}

		// Since fragments will most likely contain other block elements, they should be blocks themselves by default
		// TODO: move this into a shadow dom
		this.style.display = 'block';
		this.style.position = 'relative';

		const didNotPierce = this.dispatchEvent(new Event('fragment-outlet-ready', { bubbles: true, cancelable: true }));

		// There is no <web-fragment-host> element mounted that needs to pierce into <fragment-outlet>.
		// Instantiate a <web-fragment-host> element that can fetch the fragment via reframed
		if (didNotPierce) {
			const fragmentHost = document.createElement('web-fragment-host');
			fragmentHost.setAttribute('fragment-id', fragmentId);
			this.appendChild(fragmentHost);
		}

		// TODO: is this the best way to expose the reframed iframe? This is a race condition trap.
		// review and discuss...
		Object.defineProperty(this, 'iframe', {
			get: () => (this.firstElementChild as HTMLElement & { iframe: HTMLIFrameElement })?.iframe,
		});
	}
}
