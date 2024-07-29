const styleId = "legacy-styles";
const head = document.head || document.getElementsByTagName("head")[0];

const injectLegacyStyles = () => {
	// Comment out the following styling injection to test out fragment style reset
	const css = `
	  :root {
	    color: rgba(255, 255, 255, 0.87);
	    font-size: 16px;
	  }
	`;

	let styleElement = document.getElementById(styleId);
	if (styleElement) {
		styleElement.innerText = "";
	} else {
		styleElement = document.createElement("style");
		styleElement.id = styleId;
		head.appendChild(styleElement);
	}
	styleElement.appendChild(document.createTextNode(css));
};
injectLegacyStyles();
