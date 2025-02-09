// middleware utils decoupling

export const fragmentHostInitialization = ({
	fragmentId,
	content,
	classNames,
}: {
	fragmentId: string;
	content: string;
	classNames: string;
}) => {
	return {
		prefix: `<fragment-host class="${classNames}" "data-attibute-test="new_version" fragment-id="${fragmentId}" data-attribute-piercing="true"><template shadowrootmode="open">${content}`,
		suffix: `</template></fragment-host>`
	};
};
