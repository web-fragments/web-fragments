document.getElementById('external-script-defer-running').checked = true;
if (window.parent !== window && window.SCRIPT_CONTEXT_MARKER === '🔥') {
	document.getElementById('external-script-defer-reframed').checked = true;
}
window.SCRIPT_COUNTER++;
