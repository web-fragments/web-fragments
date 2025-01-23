import type { FragmentGateway } from '../fragment-gateway';
import { fragmentHostInitialization } from '../utils/host-utils';
import { HTMLRewriter } from 'htmlrewriter';
import type { FragmentMiddlewareOptions, FragmentConfig } from '../utils/types';
/**
 * The standard middleware provides support for standard req, res, next like fetch. 
 * This is the generic implementation
 */

export function getStandardMiddleware(
  gateway: FragmentGateway,
  options: FragmentMiddlewareOptions = {}
): (req: Request, next: () => Promise<Response>) => Promise<Response> {
  const { additionalHeaders = {}, mode = 'development' } = options;
  console.log('### Using standard middleware!!!!!');

  return async (req: Request, next: () => Promise<Response>) => {
    const matchedFragment = gateway.matchRequestToFragment(req);
    console.log('### Using standard middleware!!!!! matchedFragment:', matchedFragment);

    if (matchedFragment) {
      if (req.headers.get('sec-fetch-dest') === 'iframe') {
        return new Response('<!doctype html><title>', { headers: { 'Content-Type': 'text/html' } });
      }

      const fragmentResponse = fetchFragment(req, matchedFragment);

      if (req.headers.get('sec-fetch-dest') === 'document') {
        const hostResponse = await next();
        const isHTMLResponse = hostResponse.headers.get('content-type')?.startsWith('text/html');

        if (hostResponse.ok && isHTMLResponse) {
          return fragmentResponse
            .then(rejectErrorResponses)
            .catch(handleFetchErrors(req, matchedFragment))
            .then(prepareFragmentForReframing)
            .then(embedFragmentIntoHost(hostResponse, matchedFragment))
            .then(attachForwardedHeaders(fragmentResponse, matchedFragment))
            .catch(renderErrorResponse);
        }
      }

      return fragmentResponse;
    } else {
      return next();
    }
  };

  async function fetchFragment(req: Request, fragmentConfig: FragmentConfig): Promise<Response> {
    const { endpoint } = fragmentConfig;
    const requestUrl = new URL(req.url);
    const fragmentEndpoint = new URL(`${requestUrl.pathname}${requestUrl.search}`, endpoint);

    const fragmentReq = new Request(fragmentEndpoint.toString(), req);

    new Headers(additionalHeaders).forEach((value, name) => {
      fragmentReq.headers.set(name, value);
    });

    fragmentReq.headers.set('sec-fetch-dest', 'empty');
    fragmentReq.headers.set('x-fragment-mode', 'embedded');

    if (mode === 'development') {
      fragmentReq.headers.set('Accept-Encoding', 'gzip');
    }

    return fetch(fragmentReq);
  }

  function rejectErrorResponses(response: Response): Response {
    if (response.ok) return response;
    throw response;
  }

  function handleFetchErrors(req: Request, fragmentConfig: FragmentConfig) {
    return async (error: unknown): Promise<Response> => {
      const {
        endpoint,
        onSsrFetchError = () => ({
          response: new Response(
            mode === 'development'
              ? `<p>Fetching fragment from upstream endpoint URL: ${endpoint}, failed.</p>`
              : '<p>There was a problem fulfilling your request.</p>',
            { headers: { 'Content-Type': 'text/html' } }
          ),
          overrideResponse: false,
        }),
      } = fragmentConfig;

      const { response, overrideResponse } = await onSsrFetchError(req, error);
      if (overrideResponse) throw response;
      return response;
    };
  }

  function renderErrorResponse(err: unknown): Response {
    if (err instanceof Response) return err;
    throw err;
  }

  function prepareFragmentForReframing(fragmentResponse: Response): Response {
    return new HTMLRewriter()
      .on('script', {
        element(element) {
          const scriptType = element.getAttribute('type');
          if (scriptType) {
            element.setAttribute('data-script-type', scriptType);
          }
          element.setAttribute('type', 'inert');
        },
      })
      .transform(fragmentResponse);
  }

  function embedFragmentIntoHost(hostResponse: Response, fragmentConfig: FragmentConfig) {
    return (fragmentResponse: Response) => {
      const { fragmentId, prePiercingClassNames } = fragmentConfig;

      return new HTMLRewriter()
        .on('head', {
          element(element) {
            element.append(gateway.prePiercingStyles, { html: true });
          },
        })
        .on('body', {
          async element(element) {
            element.append(
              fragmentHostInitialization({
                fragmentId,
                content: await fragmentResponse.text(),
                classNames: prePiercingClassNames.join(' '),
              }),
              { html: true }
            );
          },
        })
        .transform(hostResponse);
    };
  }

  function attachForwardedHeaders(fragmentResponse: Promise<Response>, fragmentConfig: FragmentConfig) {
    return async (response: Response) => {
      const fragmentHeaders = (await fragmentResponse).headers;
      const { forwardFragmentHeaders = [] } = fragmentConfig;

      for (const header of forwardFragmentHeaders) {
        response.headers.append(header, fragmentHeaders.get(header) || '');
      }

      return response;
    };
  }
}
