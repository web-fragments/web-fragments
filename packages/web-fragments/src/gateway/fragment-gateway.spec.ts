import { FragmentGateway } from './fragment-gateway';
import { describe, test, expect, beforeAll } from 'vitest';

describe('matchRequestToFragment()', () => {
	const fragmentGateway = new FragmentGateway();
	fragmentGateway.registerFragment({
		fragmentId: 'fragment-1',
		routePatterns: ['/foo/:_*', '/_fragments/foo/:_*', '/__shared?a=a&b=b', '/__shared?param=/:id/foo'],
		endpoint: 'https://example-fragment.com',
	});
	fragmentGateway.registerFragment({
		fragmentId: 'fragment-2',
		routePatterns: ['/bar/:_*', '/_fragments/bar/:_*', '/__shared?param=/:id/bar'],
		endpoint: 'https://example-fragment-bar.com',
	});

	test('should match fragment-1: /foo/bar', () => {
		const url = '/foo/bar';
		const fragment = fragmentGateway.matchRequestToFragment(url);
		expect(fragment?.fragmentId).toBe('fragment-1');
	});

	test('should match fragment-1: /_fragments/foo/app.js', () => {
		const url = '/_fragments/foo/app.js';
		const fragment = fragmentGateway.matchRequestToFragment(url);
		expect(fragment?.fragmentId).toBe('fragment-1');
	});

	test('should match fragment-1: /__shared?param=/hash123/foo', () => {
		const url = '/__shared?param=%2Fhash123%2Ffoo';
		const fragment = fragmentGateway.matchRequestToFragment(url);
		expect(fragment?.fragmentId).toBe('fragment-1');
	});

	test('should match fragment-1: /__shared?param=/hash123/foo&extra_param=bar', () => {
		const url = '/__shared?param=%2Fhash123%2Ffoo';
		const fragment = fragmentGateway.matchRequestToFragment(url);
		expect(fragment?.fragmentId).toBe('fragment-1');
	});

	test('should match fragment-1: /__shared?a=a&b=b', () => {
		const url = '/__shared?a=a&b=b';
		const fragment = fragmentGateway.matchRequestToFragment(url);
		expect(fragment?.fragmentId).toBe('fragment-1');
	});

	test('should match fragment-2: /__shared?param=/hash123/bar', () => {
		const url = '/__shared?param=%2Fhash123%2Fbar';
		const fragment = fragmentGateway.matchRequestToFragment(url);
		expect(fragment?.fragmentId).toBe('fragment-2');
	});

	test('should fail to match any fragment: /baz', () => {
		const url = '/baz';
		const fragment = fragmentGateway.matchRequestToFragment(url);
		expect(fragment).not.toBeTruthy();
	});

	test('should fail to match any fragment: /__shared', () => {
		const url = '/__shared';
		const fragment = fragmentGateway.matchRequestToFragment(url);
		expect(fragment).not.toBeTruthy();
	});

	test('should fail to match any fragment: /__shared?a=a', () => {
		const url = '/__shared?a=a';
		const fragment = fragmentGateway.matchRequestToFragment(url);
		expect(fragment).not.toBeTruthy();
	});
});
