import { assert } from './utils/assert';
import { getInternalReference } from './iframe-patches';

export function reframedDomInsertion<T extends Node>(
	nodeToInsert: T,
	doInsertTheNode: Function,
	iframeDocument?: Document,
): T {
	// if we are operating outside of a reframed DOM or the appended child is not an element, then just append
	if (!iframeDocument || !(nodeToInsert instanceof HTMLElement)) {
		return doInsertTheNode();
	}

	// if the child's prototype is directly HTMLElement, then check if this is a HTML/BODY/HEAD element and rewrite it
	if (Object.getPrototypeOf(nodeToInsert) === HTMLElement.prototype) {
		rewriteTagName(nodeToInsert);
	}

	// if the child is a script, then append and execute it in a reframed context
	if (nodeToInsert instanceof HTMLScriptElement) {
		// if the child is an unattached inline script that doesn't yet have text any content, then we need treat it in a special way
		if (!nodeToInsert.src && !nodeToInsert.firstChild && !nodeToInsert.parentNode) {
			prepareUnattachedInlineScript(nodeToInsert, iframeDocument!);
			return doInsertTheNode();
		}

		setInertScriptType(nodeToInsert);
		doInsertTheNode();
		restoreScriptType(nodeToInsert);
		executeInertScript(nodeToInsert, iframeDocument);
		return nodeToInsert;
	}

	const nestedScripts = nodeToInsert.querySelectorAll('script') ?? [];

	// if the child doesn't contains nested scripts, then just append it
	if (!nestedScripts) {
		return doInsertTheNode();
	}

	// otherwise, append the child and execute all nested scripts in a reframed context
	nestedScripts.forEach((nestedScript) => setInertScriptType(nestedScript));
	doInsertTheNode();
	nestedScripts.forEach((nestedScript) => restoreScriptType(nestedScript));

	nestedScripts.forEach((nestedScript) => executeInertScript(nestedScript, iframeDocument));

	return nodeToInsert;
}

export function executeScriptsInPiercedFragment(shadowRoot: ShadowRoot, iframe: HTMLIFrameElement) {
	// In addition to executing scripts, we also need to patch wf- tags if they are present so that the scripts see them
	// without the prefix.
	[...shadowRoot.querySelectorAll('wf-html, wf-body, wf-head')].forEach(rewriteTagName);

	const scripts = [...shadowRoot.querySelectorAll('script')];

	scripts.forEach((script) => {
		restoreScriptType(script);

		const iframeDocument = iframe.contentDocument;

		assert(iframeDocument !== null, 'iframe.contentDocument is not defined');

		getInternalReference(iframeDocument, 'body').appendChild(iframeDocument.importNode(script, true));
	});
}

/**
 * Weak map of scripts running in the iframe to their inert clones in the reframed DOM.
 */
export const execToInertScriptMap = new WeakMap<HTMLScriptElement, HTMLScriptElement>();

/**
 * Executes a script in a reframed JS context.
 * @param inertScript inert script already appended to a document within reframed DOM
 * @param iframeDocument iframe document in which the script should execute.
 * @returns true if the script executed, false if it was ignored
 */
export function executeInertScript(inertScript: HTMLScriptElement, iframeDocument: Document): boolean {
	// If the script does not have a valid type attribute, treat the script node as a data block.
	// We can add the data block directly to the main document instead of the iframe context.
	const validScriptTypes = ['module', 'text/javascript', 'importmap', 'speculationrules', '', null];
	if (!validScriptTypes.includes(inertScript.getAttribute('type'))) {
		return false;
	}

	assert(!!(inertScript.src || inertScript.textContent), `Can't execute script without src or textContent!`);

	const execScript = iframeDocument.importNode(inertScript, true);
	execToInertScriptMap.set(execScript, inertScript);

	// the following line will append the executable script to iframe
	// - inline scripts (script with textContent) will be executed synchronously when attached
	// - external scripts (with src attribute) will execute once the current turn of the event loop unwinds
	getInternalReference(iframeDocument, 'body').appendChild(execScript);

	return true;
}

/**
 * Set the type attribute of a script element to "inert".
 *
 * This prevents the script from executing in the main JS context when the script is attached to the main document.
 *
 * @param script
 */
export function setInertScriptType(script: HTMLScriptElement) {
	const scriptType = script.type;
	if (scriptType) {
		script.setAttribute('data-script-type', scriptType);
	}
	script.setAttribute('type', 'inert');
}

/**
 * Restore the original script type and erase any signs of us making the script inert.
 *
 * @param script
 */
export function restoreScriptType(script: HTMLScriptElement) {
	const scriptType = script.getAttribute('data-script-type');
	script.removeAttribute('data-script-type');
	script.removeAttribute('type');
	if (scriptType) {
		script.setAttribute('type', scriptType);
	}
}

/**
 * Inline scripts that do not have textContent set are not evaluated until the the first time textContent is set.
 *
 * We prepare these scripts for future execution by:
 * - appending a non-neutralized clone of the script to the iframe document
 * - neutralizing the original script so that it doesn't execute in the main JS context in the future
 * - patching the script's appendChild method to also append to the clone which will execute the script in the reframed context
 *
 * If a text content is added later, the script then executes in the reframed context.
 *
 * @param script Script element to prepare
 * @param iframeDocument Reframed iframe document
 */
function prepareUnattachedInlineScript(script: HTMLScriptElement, iframeDocument: Document) {
	// We must clone the script before neutralizing it, otherwise the clone will also be neutralized
	const execScript = iframeDocument.importNode(script, true);
	const inertScript = script;

	// neutralize the script so that it doesn't execute in the main JS context
	inertScript.textContent = '//inert';
	// TODO: should we use a different document?
	document.body.appendChild(inertScript);

	// now restore the inert script so the code using it doesn't see what we did
	inertScript.remove();
	inertScript.firstChild!.remove();

	execToInertScriptMap.set(execScript, inertScript);
	getInternalReference(iframeDocument, 'body').appendChild(execScript);

	const origScriptAppendChild = inertScript.appendChild;
	inertScript.appendChild = function (node) {
		origScriptAppendChild.call(inertScript, node);
		execScript.appendChild.call(execScript, iframeDocument.importNode(node, true));
		// restore appendChild since only the first invocation should executes a script
		inertScript.appendChild = origScriptAppendChild;
		return node;
	};
}

// Rewrite the tagname for special custom elements added by writable-dom.
// Remove the WF-* prefix, but only for those elements.
//
// TODO: optimize patch for tagname rewrite to short circuit earlier,
// otherwise we potentially need to run this check millions/billions of times
const WF_CUSTOM_ELEMENTS = new Set(['WF-HTML', 'WF-HEAD', 'WF-BODY']);
function rewriteTagName(node: Element) {
	const originalTagName = node.tagName;
	if (WF_CUSTOM_ELEMENTS.has(originalTagName)) {
		Object.defineProperty(node, 'tagName', {
			get() {
				return originalTagName.replace(/^WF-/i, '');
			},
		});
	}
}
