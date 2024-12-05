document.getElementById('external-script-module-running').checked = true;
if (window.parent !== window && window.SCRIPT_CONTEXT_MARKER === '🔥') {
	document.getElementById('external-script-module-reframed').checked = true;
}
window.SCRIPT_COUNTER++;
