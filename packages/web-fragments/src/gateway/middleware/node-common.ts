import { IncomingMessage, ServerResponse } from 'http';
import { FragmentGateway } from 'web-fragments/gateway';
import { HTMLRewriter } from 'htmlrewriter';
import fs from 'fs';
import path from 'path';
import stream from 'stream';
import streamWeb from 'stream/web';
import { fetchFragment, fragmentHostInitialization, prepareFragmentForReframing, attachForwardedHeaders, renderErrorResponse } from '../utils/common-utils';
import type { FragmentMiddlewareOptions, FragmentConfig } from '../utils/types';


const NodeReadable = stream?.Readable ?? (class {} as typeof import('stream').Readable);

async function streamToPromise(stream: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks as unknown as Uint8Array[])));
        stream.on('error', reject);
    });
}

export function getNodeMiddleware(gateway: FragmentGateway, options: FragmentMiddlewareOptions = {}) {
    console.log('[Debug Info]: ______________Using NEW COMMON Node middleware');
    const { additionalHeaders = {}, mode = 'development' } = options;

    return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const reqUrl = new URL(req.url!, `http://${req.headers.host}`);
        const body = req.method !== 'GET' && req.method !== 'HEAD' ? await streamToPromise(req) : undefined;
        console.log('[Debug Info | Local request]:', reqUrl.href);

        const matchedFragment = gateway.matchRequestToFragment(reqUrl.href);
        if (matchedFragment) {
            console.log('[Debug Info | Matched Fragment]:' + JSON.stringify(matchedFragment));
            const request = new Request(reqUrl.href, {
                method: req.method,
                headers: req.headers as any,
                body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
            });
            const fragmentResponse = await fetchFragment(request, matchedFragment, additionalHeaders as Record<string, string>, mode);

                      if (req.headers['sec-fetch-dest'] === 'document') {
                        console.log('[Debug Info | Document request]');
                        try {
                            if (!fragmentResponse.ok) throw new Error(`Fragment response not ok: ${fragmentResponse.status}`);
          
                            res.setHeader('content-type', 'text/html');
          
                            const currentPagePath = path.join(process.cwd(), `dist/${reqUrl.pathname}.html`);
                            if (!fs.existsSync(currentPagePath)) {
                                throw new Error(`Host page not found at ${currentPagePath}`);
                            }
          
                            const hostPageReader = fs.createReadStream(currentPagePath);
                            // prepare the fragment for reframing
                            const preparedFragmentResponse = await prepareFragmentForReframing(fragmentResponse);
          
                            const rewrittenHtmlReadable = await embedFragmentIntoHost(
                                hostPageReader,
                                preparedFragmentResponse,
                                matchedFragment,
                            );
          
                            // attach headers before sending the response
                            attachForwardedHeaders(res, fragmentResponse, matchedFragment);
          
                            // stream the final transformed content to the client
                            rewrittenHtmlReadable.pipe(res);
                        } catch (err) {
                            console.error('[Error] Error during fragment embedding:', err);
                            return renderErrorResponse(err);
                        }
                    } else if (req.headers['sec-fetch-dest'] === 'iframe') {
                        // handle the iframe
                        console.log(`[Debug Info]: Handling iframe request`);
                        res.writeHead(200, { 'content-type': 'text/html' });
                        res.end('<!doctype html><title>');
                    } else {
                        if (fragmentResponse.body) {
                            res.setHeader('content-type', fragmentResponse.headers.get('content-type') || 'text/plain');
                            NodeReadable.fromWeb(fragmentResponse.body as any).pipe(res);
                        } else {
                            console.error('[Error] No body in fragment response');
                            res.statusCode = 500;
                            res.end('<p>Fragment response body is empty.</p>');
                        }
                    }
                } else {
                    return next();
                }
    };

        async function embedFragmentIntoHost(
            hostHtmlReadable: stream.Readable,
            fragmentResponse: Response,
            fragmentConfig: FragmentConfig,
        ) {
            const { fragmentId, prePiercingClassNames } = fragmentConfig;
            console.log('[[Debug Info]: Fragment Config]:', { fragmentId, prePiercingClassNames });
    
            const { prefix: fragmentHostPrefix, suffix: fragmentHostSuffix } = fragmentHostInitialization({
                fragmentId,
                classNames: prePiercingClassNames.join(''),
                content: '',
            });
            console.log('[[Debug Info]: Fragment Host]:', { fragmentHostPrefix, fragmentHostSuffix });
    
            // cast due to https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/65542
            const webReadableInput: ReadableStream = stream.Readable.toWeb(hostHtmlReadable) as ReadableStream<Uint8Array>;
    
            // const webReadableOutput = webReadableInput.pipeThrough(transformStream);
            const html = await fragmentResponse.text();
            const rewrittenResponse = new HTMLRewriter()
                .on('head', {
                    element(element: any) {
                        console.log('[[Debug Info]: HTMLRewriter]: Injecting styles into head');
                        element.append(gateway.prePiercingStyles, { html: true });
                    },
                })
                .on('body', {
                    element(element: any) {
                        const fragmentHost = fragmentHostInitialization({
                            fragmentId,
                            classNames: prePiercingClassNames.join(''),
                            content: html,
                        });
                        console.log('[[Debug Info]: Fragment Response]: Received HTML content', typeof html);
                        console.log('[[Debug Info]: HTMLRewriter]: Transforming body content');
    
                        element.append(fragmentHost.prefix, { html: true });
                        console.log('[[Debug Info]: Prefix appended]:', fragmentHost.prefix);
                        console.log('[[Debug Info]: HTML appended]:', typeof html);
                        element.append(fragmentHost.suffix, { html: true });
                        console.log('[[Debug Info]: Suffix appended]:', fragmentHost.suffix);
                    },
                })
                .transform(new Response(webReadableInput));
    
            const rewrittenBody = rewrittenResponse.body;
            const nodeReadableOuput = stream.Readable.fromWeb(rewrittenBody as streamWeb.ReadableStream);
    
            console.log('[[Debug Info]: Rewritten Content]: Successfully transformed HTML');
    
            return nodeReadableOuput;
        }
}
