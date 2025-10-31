import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { transform } from './transform';

describe('transform', () => {
	it('should transform a simple function', () => {
		const code = 'function foo() { return 1; }';
		const result = transform(code, 'test.js');
		expect(result.code).toBe('function foo() {\n  console.debug("test.js: → foo@1:0");\n  return 1;\n}');
		expect(result.sourceMap).toBeDefined();
	});
});
