import { FragmentOutlet } from './fragment-outlet';
import { FragmentHost } from './fragment-host';

export function registerWebFragmentElements() {
	window.customElements.define('fragment-outlet', FragmentOutlet);
	window.customElements.define('fragment-host', FragmentHost);
}

// keep for retro compatibility
// TODO: write test when suites are merged
export function register() {
	console.warn('[⚠️ Web Fragments Info]: register() is deprecated and will be removed in the future, please use registerFragmentElements() instead');
	registerWebFragmentElements();
}
