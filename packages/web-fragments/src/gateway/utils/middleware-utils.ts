// middleware utils decoupling
import type { FragmentConfig, FragmentGateway } from "../fragment-gateway";
import { fragmentHostInitialization } from '../utils/host-utils';
import { HTMLRewriter } from 'htmlrewriter';

export type FragmentMiddlewareOptions = {
	additionalHeaders?: HeadersInit;
	mode?: "production" | "development";
};

export type RuntimeFunction<
  Request = unknown,
  Response = unknown,
  Next = unknown
> = (...args: [Request, Response?, Next?]) => Promise<unknown> | unknown | void;

export function getMiddleware<
  RequestType = { request: Request; next: () => Promise<Response> },
  ResponseType = Response,
  NextType = unknown
>(
  gateway: FragmentGateway,
  options: FragmentMiddlewareOptions = {}
): RuntimeFunction<RequestType, ResponseType, NextType> {
  const { additionalHeaders = {}, mode = "development" } = options;
  return async (context: RequestType) => {
    const { request, next } = context as { request: Request; next: () => Promise<Response> };

    const matchedFragment = gateway.matchRequestToFragment(request);

    if (!matchedFragment) return next();

    if (isIframeRequest(request)) {
      return createResponse("<!doctype html><title>");
    }

    const fragmentResponse = fetchFragment(request, matchedFragment, additionalHeaders, mode);

    if (isDocumentRequest(request)) {
      return handleDocumentRequest(next, fragmentResponse, matchedFragment, request, gateway);
    }

    return fragmentResponse;
  };
}

// Helper functions
export function isIframeRequest(request: Request): boolean {
  return request.headers.get("sec-fetch-dest") === "iframe";
}

export function isDocumentRequest(request: Request): boolean {
  return request.headers.get("sec-fetch-dest") === "document";
}

export async function fetchFragment(
    request: Request,
    fragmentConfig: FragmentConfig,
    additionalHeaders: HeadersInit,
    mode: string
  ): Promise<Response> {
    const { upstream } = fragmentConfig;
    const requestUrl = new URL(request.url);
    const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, upstream);
  
    // Create a new request with updated headers
    const fragmentReq = new Request(upstreamUrl, {
      method: request.method,
      headers: new Headers((function() {
        const newHeaders = new Headers();
        
        // Copy existing headers
        request.headers.forEach((value, name) => {
          newHeaders.append(name, value);
        });
  
        // Merge additional headers
        Object.entries(additionalHeaders).forEach(([name, value]) => {
          newHeaders.append(name, value);
        });
  
        // Set additional necessary headers
        newHeaders.set("sec-fetch-dest", "empty");
        newHeaders.set("x-fragment-mode", "embedded");
        newHeaders.set("Accept-Encoding", mode === "development" ? "gzip" : request.headers.get("Accept-Encoding") || "");
  
        return newHeaders;
      })()), // Use an immediately invoked function to initialize headers
      body: request.body,
      credentials: request.credentials,
      cache: request.cache,
      mode: request.mode,
      redirect: request.redirect,
      referrer: request.referrer,
      integrity: request.integrity
    });
  
    return fetch(fragmentReq);
}

export async function handleDocumentRequest(
  next: () => Promise<Response>,
  fragmentResponse: Promise<Response>,
  fragmentConfig: FragmentConfig,
  fragmentRequest: Request,
  gateway: FragmentGateway
): Promise<Response> {
  const hostResponse = await next();
  const isHTMLResponse = hostResponse.headers.get("content-type")?.startsWith("text/html");

  if (!hostResponse.ok || !isHTMLResponse) return hostResponse;

  try {
    const fragment = await fragmentResponse
        .then(rejectErrorResponses)
        .catch(handleFetchErrors(fragmentConfig, fragmentRequest)); // Pass both fragmentConfig and fragmentRequest here
    
    const embeddedResponse = embedFragmentIntoHost(hostResponse, fragmentConfig, gateway, fragment);
    return attachForwardedHeaders(fragmentResponse, fragmentConfig, embeddedResponse);
    } catch (error) {
        return renderErrorResponse(error);
    }
}

export function rejectErrorResponses(response: Response): Response {
  if (response.ok) return response;
  throw response;
}

export function handleFetchErrors(
fragmentConfig: FragmentConfig,
fragmentRequest: Request,
) {
    return async (failedResOrError: unknown) => {
        const {
        upstream,
        onSsrFetchError = defaultErrorHandler,
        } = fragmentConfig;

        const fallback = onSsrFetchError;

        // Ensure both fragmentRequest and fragmentConfig are passed
        const { response, overrideResponse } = await fallback(fragmentRequest, failedResOrError);

        if (overrideResponse) throw response;
        return response;
    };
}  

export function renderErrorResponse(error: unknown): Response {
  if (error instanceof Response) return error;
  throw error;
}

export function prepareFragmentForReframing(fragmentResponse: Response): Response {
  return new HTMLRewriter()
    .on("script", {
      element(el) {
        const scriptType = el.getAttribute("type");
        if (scriptType) {
          el.setAttribute("data-script-type", scriptType);
        }
        el.setAttribute("type", "inert");
      },
    })
    .transform(fragmentResponse);
}

export function embedFragmentIntoHost(
  hostResponse: Response,
  fragmentConfig: FragmentConfig,
  gateway: FragmentGateway,
  fragmentResponse: Response
): Response {
  const { fragmentId, prePiercingClassNames } = fragmentConfig;

  return new HTMLRewriter()
    .on("head", {
      element(el) {
        el.append(gateway.prePiercingStyles, { html: true });
      },
    })
    .on("body", {
      async element(el) {
        el.append(
          fragmentHostInitialization({
            fragmentId,
            content: await fragmentResponse.text(),
            classNames: prePiercingClassNames.join(" "),
          }),
          { html: true }
        );
      },
    })
    .transform(hostResponse);
}

export async function attachForwardedHeaders(
  fragmentResponse: Promise<Response>,
  fragmentConfig: FragmentConfig,
  response: Response
): Promise<Response> {
  const headers = (await fragmentResponse).headers;
  const { forwardFragmentHeaders = [] } = fragmentConfig;

  for (const header of forwardFragmentHeaders) {
    response.headers.set(header, headers.get(header) || "");
  }

  return response;
}

export function createResponse(body: string, options: ResponseInit = {}): Response {
  return new Response(body, options);
}

export function defaultErrorHandler(
  error: unknown
): Promise<{ response: Response; overrideResponse: boolean }> {
  return Promise.resolve({
    response: new Response(
      `<p>Error fetching fragment: ${error}</p>`,
      { headers: { "content-type": "text/html" } }
    ),
    overrideResponse: false,
  });
}
