import { FragmentHost } from './fragment-host';

/**
 * Get the nearest fragment host ancestor to the given `element` or `null` if there is none.
 *
 * @param element Element from where to start looking for the fragment host (up the DOM tree)
 * @returns       The nearest fragment host ancestor or `null` if there is none.
 */
export function getFragmentHost(element: Element): FragmentHost | null {
  let current: Element | null = element;
  while (current) {
    if (isPiercingFragmentHost(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function isPiercingFragmentHost(obj: Element): obj is FragmentHost {
  // return !!obj && messageBusProp in obj;
  return !!obj;
}
