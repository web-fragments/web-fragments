import { FragmentGateway } from '../fragment-gateway';
import { fragmentHostInitialization } from '../utils/host-utils';
import { HTMLRewriter } from 'htmlrewriter';
import type { FragmentMiddlewareOptions, FragmentConfig } from '../utils/types';
/**
 * The Web middleware provides support for Web req, res, next like fetch. 
 * This is the generic implementation
 */

export function getWebMiddleware(
  gateway: FragmentGateway,
  options: FragmentMiddlewareOptions = {}
): (req: Request, next: () => Promise<Response>) => Promise<Response> {
  const { additionalHeaders = {}, mode = 'development' } = options;
  console.log('### Using Web middleware!!!!!');

  return async (req: Request, next: () => Promise<Response>) => {
    // match the fragment request to the fragment config
    const matchedFragment = gateway.matchRequestToFragment(req);
    console.log('### Using Web middleware!!!!! matchedFragment:', matchedFragment);

    if (matchedFragment) {
      // evaluate if there is a fragment match, and it's from an iframe request
      // then return an empty response
      if (req.headers.get('sec-fetch-dest') === 'iframe') {
        return new Response('<!doctype html><title>', { headers: { 'Content-Type': 'text/html' } });
      }

      const fragmentResponse = fetchFragment(req, matchedFragment);
      // if the fragment request comes from a document
      // then we will embed the fragment response into the host
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
      console.log('### No fragment match, calling next()');
      try {
        return await next();
      } catch (error) {
        console.error("Error calling next():", error);
        return new Response("Internal Server Error", { status: 500 });
      }
      
    }
  };

  // fetch the fragment from the upstream endpoint
  // as per the registration configuration
  async function fetchFragment(req: Request, fragmentConfig: FragmentConfig): Promise<Response> {
    const { endpoint } = fragmentConfig;
    const requestUrl = new URL(req.url);
    const fragmentEndpoint = new URL(`${requestUrl.pathname}${requestUrl.search}`, endpoint);
  
    const controller = new AbortController();
    const signal = controller.signal;
  
    // Set a timeout to abort the fetch request after a specified time (e.g., 5 seconds)
    const timeout = setTimeout(() => controller.abort(), 5000); // Timeout after 5 seconds
  
    const fragmentReq = new Request(fragmentEndpoint.toString(), req);
  
    Object.entries(additionalHeaders).forEach(([name, value]) => {
      fragmentReq.headers.set(name, value);
    });
    
    fragmentReq.headers.set('sec-fetch-dest', 'empty');
    fragmentReq.headers.set('vary', 'sec-fetch-dest');
    fragmentReq.headers.set('x-fragment-mode', 'embedded');
  
    // TODO: confirm this is necessary
    if (mode === 'development') {
      fragmentReq.headers.set('Accept-Encoding', 'gzip');
    }
  
    try {
      const response = await fetch(fragmentReq, { signal });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('### Fragment fetch timed out!');
      } else {
        console.error('### Error fetching fragment:', error);
      }
      throw error; 
    }
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

  // reframing operations
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
      .transform(new Response(fragmentResponse.body, fragmentResponse));
  }

  // support piercing the fragment into the host
  function embedFragmentIntoHost(hostResponse: Response, fragmentConfig: FragmentConfig) {
    return (fragmentResponse: Response) => {
      const { fragmentId, prePiercingClassNames } = fragmentConfig;
      console.log("Host Response Status:", hostResponse.status);
      console.log("Host Response Content-Type:", hostResponse.headers.get('content-type'));

      if (!hostResponse.ok) return hostResponse;
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
