// middleware utils decoupling

export const fragmentHostInitialization = ({
	fragmentId,
	content,
	classNames,
}: {
	fragmentId: string;
	content: string;
	classNames: string;
}, type?: string) => {
	if (type === 'node') {
		return {
			suffix: `<fragment-host class="${classNames}" fragment-id="${fragmentId}" data-piercing="true">
			<template shadowrootmode="open">${content}`,
			prefix: `</template></fragment-host>`
		}
	}
	return `
		<fragment-host class="${classNames}" fragment-id="${fragmentId}" data-piercing="true">
			<template shadowrootmode="open">${content}</template>
		</fragment-host>`;
};
