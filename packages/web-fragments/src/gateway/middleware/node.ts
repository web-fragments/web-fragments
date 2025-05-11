import http from 'node:http';

import { FragmentGateway, FragmentMiddlewareOptions } from 'web-fragments/gateway';
import { getWebMiddleware } from './web';
import { webToNodeMiddleware, nodeRequestToUrl } from './web-to-node-adapter';

/**
 * Creates middleware for handling fragment-based server-side rendering.
 * @param {FragmentGateway} gateway - The fragment gateway instance.
 * @param {FragmentMiddlewareOptions} [options={}] - Optional middleware settings.
 * @returns {Function} - Connect/Express-style middleware function.
 */
export function getNodeMiddleware(gateway: FragmentGateway, options: FragmentMiddlewareOptions = {}) {
	const webMiddleware = getWebMiddleware(gateway, options);

	return async (nodeRequest: http.IncomingMessage, nodeResponse: http.ServerResponse, nodeNext: () => void) => {
		if (!(nodeRequest.url && gateway.matchRequestToFragment(nodeRequestToUrl(nodeRequest).pathname))) {
			nodeResponse.setHeader('x-web-fragment-id', '<app-shell>');
			return nodeNext();
		}

		return webToNodeMiddleware(webMiddleware)(nodeRequest, nodeResponse, nodeNext);
	};
}
