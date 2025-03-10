document.getElementById('external-script-module-running').checked = true;

if (window.name === 'wf:script-loading') {
	document.getElementById('external-script-module-reframed').checked = true;
}

window.SCRIPT_COUNTER++;
