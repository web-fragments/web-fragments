// export { registerFragmentOutlet } from './fragment-outlet';

// export { FragmentHost } from './fragment-host/fragment-host';
// export { getFragmentHost } from './fragment-host/get-fragment-host';

// @ts-ignore
import piercingFragmentHostInlineScriptRaw from '../dist/fragment-host-inline-script.js?raw';

export const piercingFragmentHostInlineScript = `<script>(() => {${piercingFragmentHostInlineScriptRaw}})();</script>`;
