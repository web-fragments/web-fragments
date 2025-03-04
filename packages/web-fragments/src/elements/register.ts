import { FragmentOutlet } from './fragment-outlet';
import { FragmentHost } from './fragment-host';

/**
 * Register the web fragment elements
 */
export function registerWebFragmentElements() {
	window.customElements.define('fragment-outlet', FragmentOutlet);
	window.customElements.define('fragment-host', FragmentHost);
}

// keep for retro compatibility
// TODO: write test when suites are merged
/*
 * @deprecated use registerWebFragmentElements instead
 */
export function register() {
	registerWebFragmentElements();
}
