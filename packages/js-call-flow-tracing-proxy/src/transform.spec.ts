import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { transform } from './transform';

describe('transform', () => {
	it('should transform a simple function', () => {
		const code = 'function foo() { return 1; }';
		const result = transform(code, 'test.js');
		expect(result.code).toBe('function foo() { return 1; }\nconsole.log("Hello World!! (from test.js)");');
		expect(result.sourceMap).toBeDefined();
	});
});
