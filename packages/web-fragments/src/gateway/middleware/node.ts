import http from 'node:http';

import { FragmentGateway } from 'web-fragments/gateway';
import type { FragmentMiddlewareOptions } from '../utils/types';
import { getWebMiddleware } from './web';
import { nodeToWebMiddleware, nodeRequestToUrl } from './node-to-web-adapter';

/**
 * Creates middleware for handling fragment-based server-side rendering.
 * @param {FragmentGateway} gateway - The fragment gateway instance.
 * @param {FragmentMiddlewareOptions} [options={}] - Optional middleware settings.
 * @returns {Function} - Connect/Express-style middleware function.
 */
export function getNodeMiddleware(gateway: FragmentGateway, options: FragmentMiddlewareOptions = {}) {
	console.log('[Debug Info]: Node Compat middleware');
	const { additionalHeaders = {}, mode = 'development' } = options;

	const webMiddleware = getWebMiddleware(gateway, options);

	return async (nodeRequest: http.IncomingMessage, nodeResponse: http.ServerResponse, nodeNext: () => void) => {
		console.log('[Debug Info | Local request]:', nodeRequest.url);
		if (!(nodeRequest.url && gateway.matchRequestToFragment(nodeRequestToUrl(nodeRequest).pathname))) {
			console.log('[Debug Info]: No fragment match, calling next()');
			return nodeNext();
		}

		return nodeToWebMiddleware(webMiddleware)(nodeRequest, nodeResponse, nodeNext);
	};
}
