import type React from 'react';

declare global {
	namespace JSX {
		interface IntrinsicElements {
			'web-fragment': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
		}
	}
}

export {};
