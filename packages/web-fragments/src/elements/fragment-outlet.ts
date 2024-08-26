export class FragmentOutlet extends HTMLElement {
	async connectedCallback() {
		// TODO: remove this after fractus experiment is over.
		// We had to put this here because the remix and qwik experiments
		// both needed to render on the same route pattern, so we needed a way
		// to differentiate between which fragment should be served by the gateway.
		const fragmentId = this.getAttribute("fragment-id");
		document.cookie = `fragment_id=${fragmentId};path=/`;

		if (!fragmentId) {
			throw new Error(
				"The fragment outlet component has been applied without" +
					" providing a fragment-id"
			);
		}

		const didNotPierce = this.dispatchEvent(
			new Event("fragment-outlet-ready", { bubbles: true, cancelable: true })
		);

		// There is no <fragment-host> element mounted that needs to pierce into <fragment-outlet>.
		// Instantiate a <fragment-host> element that can fetch the fragment via reframed
		if (didNotPierce) {
			const fragmentHost = document.createElement("fragment-host");
			fragmentHost.setAttribute("fragment-id", fragmentId);
			this.appendChild(fragmentHost);
		}
	}

	disconnectedCallback() {
		// TODO: remove this after fractus experiment is over.
		// We had to put this here because the remix and qwik experiments
		// both needed to render on the same route pattern, so we needed a way
		// to differentiate between which fragment should be served by the gateway.
		const fragmentId = this.getAttribute("fragment-id");
		document.cookie = `fragment_id=${fragmentId};path=/;expires=0`;
	}

	// private reapplyFragmentModuleScripts(fragmentId: string) {
	//   if (unmountedFragmentIds.has(fragmentId)) {
	//     this.querySelectorAll('script').forEach(script => {
	//       if (script.src && script.type === 'module') {
	//         import(/* @vite-ignore */ script.src).then(
	//           scriptModule => scriptModule.default?.()
	//         );
	//       }
	//     });
	//   }
	// }
}
