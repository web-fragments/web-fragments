import http from 'node:http';

import { FragmentGateway, FragmentMiddlewareOptions } from 'web-fragments/gateway';
import { getWebMiddleware } from './web';
import { webToNodeMiddleware, nodeRequestToUrl } from './web-to-node-adapter';
import { identifyRequestType } from './web';

/**
 * Creates middleware for handling fragment-based server-side rendering.
 * @param {FragmentGateway} gateway - The fragment gateway instance.
 * @param {FragmentMiddlewareOptions} [options={}] - Optional middleware settings.
 * @returns {Function} - Connect/Express-style middleware function.
 */
export function getNodeMiddleware(gateway: FragmentGateway, options: FragmentMiddlewareOptions = {}) {
	const webMiddleware = getWebMiddleware(gateway, options);

	return async (nodeRequest: http.IncomingMessage, nodeResponse: http.ServerResponse, nodeNext: () => void) => {
		let requestFragmentId = nodeRequest.headers['x-web-fragment-id'];
		requestFragmentId = Array.isArray(requestFragmentId) ? requestFragmentId[0] : requestFragmentId ?? undefined;

		let secFetchDest = nodeRequest.headers['sec-fetch-dest'];
		secFetchDest = Array.isArray(secFetchDest) ? secFetchDest[0] : secFetchDest;

		let xFragmentMode = nodeRequest.headers['x-fragment-mode'];
		xFragmentMode = Array.isArray(xFragmentMode) ? xFragmentMode[0] : xFragmentMode;

		const requestType = identifyRequestType(secFetchDest ?? null, xFragmentMode ?? null);
		const { pathname, search } = nodeRequestToUrl(nodeRequest);
		const matchedFragment = gateway.matchRequestToFragment(`${pathname}${search}`, requestType, requestFragmentId);

		// if a fragment was requested but none matched, or if we matched a path, but fragmentId doesn't match, then send a 404 back
		if ((!matchedFragment && requestFragmentId) || (matchedFragment && !requestFragmentId)) {
			nodeResponse.writeHead(404, { 'content-type': 'text/plain;charset=UTF-8' });
			nodeResponse.end('Invalid request!');
			return;
		}

		if (!matchedFragment) {
			nodeResponse.setHeader('x-web-fragment-id', '<app-shell>');
			return nodeNext();
		}

		return webToNodeMiddleware(webMiddleware)(nodeRequest, nodeResponse, nodeNext);
	};
}
