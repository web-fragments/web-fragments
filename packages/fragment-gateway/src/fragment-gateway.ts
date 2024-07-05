import { piercingFragmentHostInlineScript } from 'fragment-elements';
import {
  concatenateStreams,
  transformStream,
  wrapStreamInText
} from './stream-utilities';

/**
 * Configuration object for the registration of a fragment in the app's gateway worker.
 */
export interface FragmentConfig {
  /**
   * Unique Id for the fragment.
   */
  fragmentId: string;
  /**
   * The framework used by the fragment. This setting allows the gateway to make
   * framework specific adjustments to the way it's served.
   */
  framework?: 'qwik' | 'react' | 'solid';
  /**
   * Styles to apply to the fragment before it gets pierced, their purpose
   * is to style the fragment in such a way to make it look as close as possible
   * to the final pierced view (so that the piercing operation can look seamless).
   *
   * For best results they should use the following selector:
   * :not(piercing-fragment-outlet) > piercing-fragment-host[fragment-id="fragmentId"]
   */
  prePiercingStyles: string;
  /**
   * Function which transforms all the requests for the fetching of a fragment using
   * custom logic. This can be used to convert url paths into search parameters (or
   * vice versa), to provide to the fragment request in the format more convenient
   * for it to consume (instead of delegating any conversions to the fragment itself).
   *
   * Note: this only applies to requests that are fetching the fragment view, requests
   * to specific assets (such as js, css, images, etc...) don't get transformed.
   */
  transformRequest?: (
    request: Request,
    fragmentConfig: FragmentConfig
  ) => Request;
  /**
   * Function which on HTML requests, based on the current request, environment and
   * context returns a boolean (or a promise of a boolean) indicating whether the
   * fragment should be included ("pre-pierced") in the current HTML response.
   */
  shouldBeIncluded: (
    request: Request,
  ) => boolean | Promise<boolean>;
  /**
   * The fetcher for the fragment
   */
  fetcher: (
    request: Request
  ) => Response | Promise<Response>;
}

/**
 * Configuration object for the implementation of the app's gateway worker.
 */
export interface PiercingGatewayConfig {
  /**
   * Function which based on the current environment returns
   * the base url for the base/legacy application.
   */
  getLegacyAppBaseUrl: () => string;
  /**
   * Allows the disabling of the whole server-side piercing based on the current request.
   */
  shouldPiercingBeEnabled?: boolean | ((
    request: Request,
  ) => boolean | Promise<boolean>);

  /**
   * When enabled, isolates the execution context of each fragment to an iframe.
   */
  isolateFragments?: () => boolean;
}

export class PiercingGateway {
  private fragmentConfigs: Map<string, FragmentConfig> = new Map();

  constructor(private config: PiercingGatewayConfig) {}

  /**
   * Registers a fragment in the gateway worker so that it can be integrated
   * with the gateway worker.
   *
   * @param fragmentConfig Configuration object for the fragment.
   */
  registerFragment(fragmentConfig: FragmentConfig) {
    if (this.fragmentConfigs.has(fragmentConfig.fragmentId)) {
      console.warn(
        "\x1b[31m Warning: you're trying to register a fragment with id" +
          ` "${fragmentConfig.fragmentId}", but a fragment with the same fragmentId` +
          ` has already been registered, thus this` +
          ' duplicate registration will be ignored. \x1b[0m'
      );
      return;
    }
    this.fragmentConfigs.set(fragmentConfig.fragmentId, fragmentConfig);
  }

  /*
    We're assigning fetch to the object itself so that user can do:
      `export default gateway;`
    this shouldn't be necessary and we should be able to have fetch
    as a normal method in the class, but that isn't currently being
    recognized correctly by the workers runtime.
  */
  fetch = async (
    request: Request,
  ): Promise<Response> => {
    const fragmentResponse = await this.handleFragmentFetch(request);
    if (fragmentResponse) return fragmentResponse;

    const fragmentAssetResponse = await this.handleFragmentAssetFetch(
      request,
    );
    if (fragmentAssetResponse) return fragmentAssetResponse;

    const htmlResponse = await this.handleHtmlRequest(request);
    if (htmlResponse) return htmlResponse;

    return this.forwardFetchToBaseApp(request);
  };

  private async isPiercingEnabled(request: Request): Promise<boolean> {
    if(this.config.shouldPiercingBeEnabled === undefined) {
      // if no option is provided the default behavior is to have piercing enabled
      return true;
    }

    if(typeof this.config.shouldPiercingBeEnabled === 'boolean') {
      return this.config.shouldPiercingBeEnabled;
    }

    return this.config.shouldPiercingBeEnabled(request);
  }

  private async handleHtmlRequest(
    request: Request
  ) {
    const requestIsForHtml = request.headers
      .get('Accept')
      ?.includes('text/html');

    if (requestIsForHtml) {
      const baseUrl = this.config.getLegacyAppBaseUrl().replace(/\/$/, '');
      const indexBodyResponse = this.fetchBaseIndexHtml(
        new Request(baseUrl, request),
      ).then(response => response.text());

      const piercingEnabled = this.isPiercingEnabled(request);

      const fragmentStreamOrNullPromises: Promise<ReadableStream | null>[] =
        !piercingEnabled
          ? []
          : Array.from(this.fragmentConfigs.values()).map(
              async fragmentConfig => {
                const shouldBeIncluded = await fragmentConfig.shouldBeIncluded(
                  request,
                );

                return shouldBeIncluded
                  ? this.fetchSSRedFragment(fragmentConfig, request)
                  : null;
              }
            );

      const [indexBody, ...fragmentStreamsOrNulls] = await Promise.all([
        indexBodyResponse,
        ...fragmentStreamOrNullPromises
      ]);

      const fragmentStreamsToInclude = fragmentStreamsOrNulls.filter(
        streamOrNull => streamOrNull !== null
      ) as ReadableStream<any>[];

      return this.returnCombinedIndexPage(
        indexBody,
        concatenateStreams(fragmentStreamsToInclude)
      );
    }
  }

  private async handleFragmentFetch(request: Request) {
    const match = request.url.match(
      /^https?:\/\/[^/]*\/piercing-fragment\/([^?/]+)\/?(?:\?.+)?/
    );

    if (match?.length !== 2) return null;

    const fragmentId = match[1];
    const fragmentConfig = this.fragmentConfigs.get(fragmentId);
    if (!fragmentConfig) {
      return new Response(
        `<p style="color: red;">configuration for fragment with id "${match[1]}" not found` +
          ' did you remember to register the fragment in the gateway?</p>'
      );
    }

    const fragmentStream = await this.fetchSSRedFragment(
      fragmentConfig,
      request,
      false
    );

    return new Response(fragmentStream, {
      headers: {
        'content-type': 'text/html;charset=UTF-8'
      }
    });
  }

  private async handleFragmentAssetFetch(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const regex = /\/_fragments\/([^/]*)\/?.*$/;
    const match = path.match(regex);
    if (match?.length !== 2) return null;
    const fragmentId = match[1];
    const fragmentConfig = this.fragmentConfigs.get(fragmentId);
    if (!fragmentConfig) return null;

    // if the request has an extra base we need to remove it here
    const adjustedReq = new Request(
      new URL(`${url.protocol}//${url.host}${match[0]}`),
      request
    );
    return this.proxyAssetRequestToFragmentWorker(
      fragmentConfig,
      adjustedReq
    );
  }

  private async forwardFetchToBaseApp(request: Request) {
    const url = new URL(request.url);
    const baseUrl = this.config.getLegacyAppBaseUrl().replace(/\/$/, '');

    const newRequest = new Request(`${baseUrl}${url.pathname}`);
    const headers = new Headers([...request.headers, ['x-bypass-piercing-gateway', '1']]);
    const res = await fetch(newRequest, {...request, headers});
    return res;
  }

  private async returnCombinedIndexPage(
    indexBody: string,
    streamToInclude: ReadableStream
  ): Promise<Response> {
    const indexOfEndBody = indexBody.indexOf('</body>');
    const preStream = indexBody.substring(0, indexOfEndBody);
    const postStream = indexBody.substring(indexOfEndBody);

    const stream = wrapStreamInText(preStream, postStream, streamToInclude);

    return new Response(stream, {
      headers: {
        'content-type': 'text/html;charset=UTF-8'
      }
    });
  }

  private async fetchBaseIndexHtml(request: Request) {
    // Note: we make sure to handle/proxy Upgrade requests, so
    //       that Vite's HMR can work for local development
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader) {
      const { webSocket } = (await fetch(request)) as unknown as {
        webSocket: WebSocket;
      };

      return new Response(null, {
        status: 101,
        webSocket
      });
    }

    const headers = new Headers([...request.headers, ['x-bypass-piercing-gateway', '1']]);
    const response = await fetch(request, { headers });

    const requestIsForHtml = request.headers
      .get('Accept')
      ?.includes('text/html');
    if (requestIsForHtml) {
      let indexBody = (await response.text()).replace(
        '</head>',
        `${piercingFragmentHostInlineScript}\n` + '</head>'
      );

      return new Response(indexBody, response);
    }

    return response;
  }

  private async fetchSSRedFragment(
    fragmentConfig: FragmentConfig,
    request: Request,
    prePiercing = true
  ): Promise<ReadableStream> {
    const fragmentFetcher = fragmentConfig.fetcher;
    const newRequest = this.getRequestForFragment(request, fragmentConfig);
    const response = await fragmentFetcher(newRequest);
    let fragmentStream = response.body!;

    // const fragmentId = fragmentConfig.fragmentId;
    // const framework = fragmentConfig.framework;

    const prePiercingStyles = prePiercing
      ? `<style>${fragmentConfig.prePiercingStyles}</style>`
      : ``;

    let template = `
      <piercing-fragment-host fragment-id=${fragmentConfig.fragmentId}>
        <template shadowrootmode="open">
          ${prePiercingStyles}
          --FRAGMENT_CONTENT--
        </template>
      </piercing-fragment-host>
    `;

    // if (this.config.isolateFragments?.(env)) {
    //   // Quotes must be escaped from srcdoc contents
    //   template = `
    //     <piercing-fragment-host fragment-id=${fragmentConfig.fragmentId}>
    //     </piercing-fragment-host>
    //     ${prePiercingStyles}
    //     <iframe id="iframe_${fragmentId}" style="display: none" srcdoc="
    //       <body>
    //         --FRAGMENT_CONTENT--
    //         ${getEscapedReframedClientCode(fragmentId)}
    //         ${(framework === 'qwik' && escapeQuotes(qwikloaderScript)) || ''}
    //       </body>
    //     "></iframe>
    //   `;

    //   fragmentStream = transformStream(fragmentStream, escapeQuotes);
    // }

    const [preFragment, postFragment] = template.split('--FRAGMENT_CONTENT--');

    const transformedFragmentStream = transformStream(fragmentStream, (chunk: string) => {
      // we rewrite scripts tags by prefixing their type with "inert-", or adding an "inert" type if they don't have one

      // Note: this is temporary/testing code and very hacky & brittle (and relies on the fact that we get script opening tags
      //       not split across different chunks), ideally for a proper solution we should use HTML rewriter or something like that

      chunk = chunk.replace(/<script([\s\S]*?)\btype="(\w+)"([\s\S]*?)>/g, '<script$1type="inert-$2"$3>');
      chunk = chunk.replace(/<script(\s*)>/g, '<script type="inert"$1>');
      return chunk;
    });

    return wrapStreamInText(preFragment, postFragment, transformedFragmentStream);
  }

  private getRequestForFragment(
    request: Request,
    fragmentConfig: FragmentConfig,
  ) {
    const url = new URL(
      request.url.replace(`piercing-fragment/${fragmentConfig.fragmentId}`, '')
    );

    const transformRequest =
      fragmentConfig.transformRequest ?? this.defaultTransformRequest;
    const newRequest = transformRequest(
      new Request(url, request),
      fragmentConfig
    );
    return newRequest;
  }

  private proxyAssetRequestToFragmentWorker(
    { fetcher }: FragmentConfig,
    request: Request
  ) {
    return fetcher(request);
  }

  private defaultTransformRequest(request: Request) {
    return request;
  }
}

// function getEscapedReframedClientCode(fragmentId: string) {
//   return `<script>
//     ${escapeQuotes(
//       reframedClient.replace(
//         '__FRAGMENT_SELECTOR__',
//         `"piercing-fragment-host[fragment-id='${fragmentId}']"`
//       )
//     )}
//   </script>`;
// }

// const escapeQuotes = (str: string) => str.replaceAll('"', `&quot;`);

// const qwikloaderScript = `<script id="qwikloader">${qwikloader}</script>`;
