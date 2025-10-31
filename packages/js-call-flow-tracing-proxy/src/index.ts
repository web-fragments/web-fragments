import { Proxy } from 'http-mitm-proxy';
import fs from 'fs';
import path from 'path';

const proxy = new Proxy();

// Configure the proxy
proxy.listen({
	port: 8081,
	sslCaDir: path.join(process.env.HOME!, '.http-mitm-proxy'),
});

// Log all requests
proxy.onRequest((ctx, callback) => {
	console.log(
		'REQUEST:',
		ctx.clientToProxyRequest.method,
		ctx.clientToProxyRequest.headers.host! + ctx.clientToProxyRequest.url,
		ctx.clientToProxyRequest!.headers['accept-encoding'],
	);

	ctx.clientToProxyRequest!.headers['accept-encoding'] = 'gzip';
	ctx.proxyToServerRequestOptions!.headers['accept-encoding'] = 'gzip, deflate';

	if (ctx.clientToProxyRequest.headers.host === 'js.stripe.com') {
		ctx.use(Proxy.gunzip);

		ctx.onResponse((ctx, callback) => {
			if (ctx.serverToProxyResponse?.headers['content-type']?.startsWith('text/html')) {
				ctx.serverToProxyResponse.headers['x-jcftp-content-security-policy'] =
					ctx.serverToProxyResponse.headers['content-security-policy']!;
				delete ctx.serverToProxyResponse.headers['content-security-policy'];
			} else if (ctx.serverToProxyResponse?.headers['content-type']?.startsWith('text/javascript')) {
				ctx.proxyToClientResponse.setHeader('x-jcftp-modified', 'true');
			}

			callback();
		});

		ctx.onResponseData(function (ctx, chunk, callback) {
			//console.log('RESPONSE DATA:', chunk.toString());
			return callback(null, chunk);
		});

		ctx.onResponseEnd((ctx, callback) => {
			if (ctx.serverToProxyResponse?.headers['content-type']?.startsWith('text/javascript')) {
				console.log('appending!!');
				ctx.proxyToClientResponse.end(
					`;console.log('jcftp: hello from ${ctx.clientToProxyRequest.headers.host!}${ctx.clientToProxyRequest.url}');`,
				);
			}
			callback();
		});

		// You can modify requests here if needed
		return callback();
	}

	callback();
});

// Log all responses
proxy.onResponse((ctx, callback) => {
	console.log(
		'RESPONSE:',
		ctx.serverToProxyResponse!.statusCode,
		ctx.clientToProxyRequest.headers.host! + ctx.clientToProxyRequest.url,
	);

	ctx.proxyToClientResponse.setHeader('x-call-flow-tracing', 'true');

	// You can modify responses here if needed
	return callback();
});

// Handle errors
proxy.onError((ctx, err) => {
	console.error('Error:', err);
});

console.log('MITM Proxy listening on port 8081');
