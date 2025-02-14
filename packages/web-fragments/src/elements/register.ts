import { WebFragment } from './web-fragment';
import { WebFragmentHost } from './web-fragment-host';

/**
 * Register the web fragment elements
 */
export function initializeWebFragments() {
	window.customElements.define('web-fragment', WebFragment);
	window.customElements.define('web-fragment-host', WebFragmentHost);
}
