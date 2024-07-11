import { FragmentOutlet } from "./fragment-outlet";
import { FragmentHost } from "./fragment-host";

export function register() {
	window.customElements.define("fragment-outlet", FragmentOutlet);
	window.customElements.define("fragment-host", FragmentHost);
}
