import WritableDOMStream from 'writable-dom';
import { FragmentHost } from './fragment-host/fragment-host';

/**
 * Registers the "fragment-outlet" web component so that it can be used throughout
 * the application.
 */
export function registerFragmentOutlet() {
  window.customElements.define('fragment-outlet', FragmentOutlet);
}

/**
 * Set of ids of fragments that have been previously unmounted.
 *
 * We keep track of this to know whether to manually run side-effects in modules
 * that are referenced as part of the fragment.
 *
 * When we fetch a fragment for the first time any side-effects in module-type scripts
 * that are referenced will be executed.
 * Later, if we fetch the fragment again, its side-effects will not run automatically.
 * To workaround this we ensure that all such modules also expose their side-effects
 * via a default export function.
 * We then manually call that default export to re-execute the side-effects.
 */
const unmountedFragmentIds: Set<string> = new Set();

export class FragmentOutlet extends HTMLElement {
  // this field can be read from the outside to check if this element
  // is a FragmentOutlet (without relying on `instanceof`)
  // @ts-ignore - the following field is accessed by `fragmentIsPierced.isFragmentPierced`.
  private readonly fragmentOutlet = true;

  private fragmentHost: FragmentHost | null = null;

  constructor() {
    super();
  }

  async connectedCallback() {
    const fragmentId = this.getAttribute('fragment-id');

    if (!fragmentId) {
      throw new Error(
        'The fragment outlet component has been applied without' +
          ' providing a fragment-id'
      );
    }

    this.fragmentHost = this.getFragmentHost(fragmentId);

    if (this.fragmentHost) {
      // There is already a fragment host in the DOM that we can pierce into this outlet
      this.innerHTML == '';
      this.fragmentHost.pierceInto(this);
    } else {
      // We need to fetch and create the fragment host
      const fragmentStream = await this.fetchFragmentStream(fragmentId);
      await this.streamFragmentIntoOutlet(fragmentId, fragmentStream);
      this.fragmentHost = this.getFragmentHost(fragmentId, true);
    }

    if (!this.fragmentHost) {
      throw new Error(
        `The fragment with id "${fragmentId}" is not present and` +
          ' it could not be fetched'
      );
    }
    // We need to dispatch a qinit so that Qwik can run different necessary
    // checks/logic on Qwik fragments (which it would otherwise not with this
    // fragments implementation).
    // (for more info see: https://github.com/BuilderIO/qwik/issues/1947)
    document.dispatchEvent(new Event('qinit'));
  }

  disconnectedCallback() {
    if (this.fragmentHost) {
      unmountedFragmentIds.add(this.fragmentHost.fragmentId);
      this.fragmentHost = null;
    }
  }

  private async fetchFragmentStream(fragmentId: string) {
    const url = this.getFragmentUrl(fragmentId);

    const req = new Request(url);
    const response = await fetch(req);
    if (!response.body) {
      throw new Error(
        'An empty response has been provided when fetching' +
          ` the fragment with id ${fragmentId}`
      );
    }
    return response.body;
  }

  private getFragmentUrl(fragmentId: string): string {
    return `/fragment/${fragmentId}`;
  }

  private async streamFragmentIntoOutlet(
    fragmentId: string,
    fragmentStream: ReadableStream
  ) {
    await fragmentStream
      .pipeThrough(new TextDecoderStream())
      .pipeTo(new WritableDOMStream(this as ParentNode));

    this.reapplyFragmentModuleScripts(fragmentId);
  }

  private reapplyFragmentModuleScripts(fragmentId: string) {
    if (unmountedFragmentIds.has(fragmentId)) {
      this.querySelectorAll('script').forEach(script => {
        if (script.src && script.type === 'module') {
          import(/* @vite-ignore */ script.src).then(
            scriptModule => scriptModule.default?.()
          );
        }
      });
    }
  }

  private getFragmentHost(
    fragmentId: string,
    insideOutlet = false
  ): FragmentHost | null {
    return (insideOutlet ? this : document).querySelector(
      `fragment-host[fragment-id="${fragmentId}"]`
    );
  }
}
