/**
 * For CSS selectors that contain html, head, and body tag names, rewrite the selector with the wf-* prefix.
 *
 * Breakdown of the regex:
 * (?<=^|[\s>+~,(]) - lookbehind to only match when preceded by start of string, whitespace and combinators
 * \b(body|head|html)\b - match body|head|html exactly, but only at word boundaries
 * (?=[\s>+~),:.#[\]]|$) - lookahead to only match when followed by start of string or combinators
 */
export const rewriteQuerySelector = (selector: string) =>
	selector.replace(
		/(?<=^|[\s>+~,(])\b(body|head|html)\b(?=[\s>+~),:.#[\]]|$)/gi,
		(match) => `wf-${match.toLowerCase()}`,
	);
