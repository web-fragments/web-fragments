import { describe, test, expect } from 'vitest';
import { rewriteQuerySelector } from './selector-helpers';

describe('rewriteQuerySelector()', () => {
	test('Tag selectors (body) are rewritten', () => {
		expect(rewriteQuerySelector('html')).toBe('wf-html');
		expect(rewriteQuerySelector('head')).toBe('wf-head');
		expect(rewriteQuerySelector('body')).toBe('wf-body');

		// tag selectors are case-insensitive
		expect(rewriteQuerySelector('BODY')).toBe('wf-body');
	});

	test('Tag selectors with non-exact matches (bodybody) are preserved', () => {
		expect(rewriteQuerySelector('bodybody')).toBe('bodybody');
		expect(rewriteQuerySelector('htmlhead')).toBe('htmlhead');
	});

	test('Comma separated selectors (html, body) are rewritten', () => {
		expect(rewriteQuerySelector('html, body')).toBe('wf-html, wf-body');
	});

	test('Descendant combinators (html body) are rewritten', () => {
		expect(rewriteQuerySelector('html body')).toBe('wf-html wf-body');
	});

	test('Child combinators (html > body > div) are rewritten', () => {
		expect(rewriteQuerySelector('html > body > div')).toBe('wf-html > wf-body > div');
	});

	test('Subsequent sibling combinators (head~body) are rewritten', () => {
		expect(rewriteQuerySelector('html > head~body')).toBe('wf-html > wf-head~wf-body');
	});

	test('Next sibling combinators (head + body) are rewritten', () => {
		expect(rewriteQuerySelector('head+body')).toBe('wf-head+wf-body');
	});

	test('Complex queries (body>head, .body+head > body:hover") are rewritten', () => {
		expect(rewriteQuerySelector('body>head, .body+head > body:hover"')).toBe(
			'wf-body>wf-head, .body+wf-head > wf-body:hover"',
		);
	});

	test('Class selectors (.body) are preserved', () => {
		expect(rewriteQuerySelector('.body')).toBe('.body');
		expect(rewriteQuerySelector('html body.body')).toBe('wf-html wf-body.body');
	});

	test('ID selectors (#body) are preserved', () => {
		expect(rewriteQuerySelector('#body')).toBe('#body');
		expect(rewriteQuerySelector('html body#body .body')).toBe('wf-html wf-body#body .body');
	});

	test('Attribute selectors ([data-attr="body"]) are preserved', () => {
		expect(rewriteQuerySelector('html > div [data-attr="body"]')).toBe('wf-html > div [data-attr="body"]');
	});

	test('Non-matched selectors (div, p, a) are preserved', () => {
		expect(rewriteQuerySelector('div, p, a')).toBe('div, p, a');
	});

	test('Valid wf-(html|head|body) selectors are preserved', () => {
		expect(rewriteQuerySelector('wf-html, wf-head + wf-body')).toBe('wf-html, wf-head + wf-body');
	});

	test('Support array as an argument and stringify it', () => {
		expect(rewriteQuerySelector(['p', 'span'] as any)).toBe('p,span');
	});
});
