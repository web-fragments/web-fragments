// import { piercingFragmentHostInlineScript } from './index';
import {
  // concatenateStreams,
  // transformStream,
  wrapStreamInText
} from './stream-utilities';
// for debugging replace `qwikloader.js` with `qwikloader.debug.js` to have the code non-minified
// @ts-ignore
// import qwikloader from '@builder.io/qwik/qwikloader.js?raw';
// import reframedClient from './reframed-client?raw';

/**
 * Configuration object for the registration of a fragment in the app's gateway worker.
 */
export interface FragmentConfig<Env> {
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
    env: Env,
    fragmentConfig: FragmentConfig<Env>
  ) => Request;
  /**
   * Function which on HTML requests, based on the current request, environment and
   * context returns a boolean (or a promise of a boolean) indicating whether the
   * fragment should be included ("pre-pierced") in the current HTML response.
   */
  shouldBeIncluded: (
    request: Request,
    env: Env,
    ctx: unknown
  ) => boolean | Promise<boolean>;
}

/**
 * Configuration object for the implementation of the app's gateway worker.
 */
export interface PiercingGatewayConfig<Env> {
  /**
   * Function which based on the current environment returns
   * the base url for the base/legacy application.
   */
  getLegacyAppBaseUrl: (env: Env) => string;
  /**
   * Allows the disabling of the whole server-side piercing based on the current request.
   */
  shouldPiercingBeEnabled?: (
    request: Request,
    env: Env,
    ctx: unknown
  ) => boolean | Promise<boolean>;

  /**
   * When enabled, isolates the execution context of each fragment to an iframe.
   */
  isolateFragments?: (env: Env) => boolean;
}

export class PiercingGateway<Env> {
  private fragmentConfigs: Map<string, FragmentConfig<Env>> = new Map();

  constructor(private config: PiercingGatewayConfig<Env>) {}

  /**
   * Registers a fragment in the gateway worker so that it can be integrated
   * with the gateway worker.
   *
   * @param fragmentConfig Configuration object for the fragment.
   */
  registerFragment(fragmentConfig: FragmentConfig<Env>) {
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
    env: Env,
    ctx: unknown
  ): Promise<Response> => {
    this.validateFragmentConfigs(env);

    const fragmentResponse = await this.handleFragmentFetch(request, env);
    if (fragmentResponse) return fragmentResponse;

    const fragmentAssetResponse = await this.handleFragmentAssetFetch(
      request,
      env
    );
    if (fragmentAssetResponse) return fragmentAssetResponse;

    // const htmlResponse = await this.handleHtmlRequest(request, env, ctx);
    // if (htmlResponse) return htmlResponse;

    return this.forwardFetchToBaseApp(request, env);
  };

  // private async handleHtmlRequest(
  //   request: Request,
  //   env: Env,
  //   ctx: ExecutionContext
  // ) {
  //   const requestIsForHtml = request.headers
  //     .get('Accept')
  //     ?.includes('text/html');

  //   if (requestIsForHtml) {
  //     const baseUrl = this.config.getLegacyAppBaseUrl(env).replace(/\/$/, '');
  //     const indexBodyResponse = this.fetchBaseIndexHtml(
  //       new Request(baseUrl, request),
  //       env
  //     ).then(response => response.text());

  //     const piercingEnabled =
  //       !this.config.shouldPiercingBeEnabled ||
  //       (await this.config.shouldPiercingBeEnabled(request, env, ctx));

  //     const fragmentStreamOrNullPromises: Promise<ReadableStream | null>[] =
  //       !piercingEnabled
  //         ? []
  //         : Array.from(this.fragmentConfigs.values()).map(
  //             async fragmentConfig => {
  //               const shouldBeIncluded = await fragmentConfig.shouldBeIncluded(
  //                 request,
  //                 env,
  //                 ctx
  //               );

  //               return shouldBeIncluded
  //                 ? this.fetchSSRedFragment(env, fragmentConfig, request)
  //                 : null;
  //             }
  //           );

  //     const [indexBody, ...fragmentStreamsOrNulls] = await Promise.all([
  //       indexBodyResponse,
  //       ...fragmentStreamOrNullPromises
  //     ]);

  //     const fragmentStreamsToInclude = fragmentStreamsOrNulls.filter(
  //       streamOrNull => streamOrNull !== null
  //     ) as ReadableStream<any>[];

  //     return this.returnCombinedIndexPage(
  //       indexBody,
  //       concatenateStreams(fragmentStreamsToInclude)
  //     );
  //   }
  // }

  private async handleFragmentFetch(request: Request, env: Env) {
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
      env,
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

  private async handleFragmentAssetFetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const regex = /\/_fragment\/([^/]*)\/?.*$/;
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
      env,
      fragmentConfig,
      adjustedReq
    );
  }

  private forwardFetchToBaseApp(request: Request, env: Env) {
    const url = new URL(request.url);
    const baseUrl = this.config.getLegacyAppBaseUrl(env).replace(/\/$/, '');

    const newRequest = new Request(`${baseUrl}${url.pathname}`);
    return fetch(newRequest, request);
  }

  // private async returnCombinedIndexPage(
  //   indexBody: string,
  //   streamToInclude: ReadableStream
  // ): Promise<Response> {
  //   const indexOfEndBody = indexBody.indexOf('</body>');
  //   const preStream = indexBody.substring(0, indexOfEndBody);
  //   const postStream = indexBody.substring(indexOfEndBody);

  //   const stream = wrapStreamInText(preStream, postStream, streamToInclude);

  //   return new Response(stream, {
  //     headers: {
  //       'content-type': 'text/html;charset=UTF-8'
  //     }
  //   });
  // }

  // private async fetchBaseIndexHtml(request: Request, env: Env) {
  //   // Note: we make sure to handle/proxy Upgrade requests, so
  //   //       that Vite's HMR can work for local development
  //   const upgradeHeader = request.headers.get('Upgrade');
  //   if (upgradeHeader) {
  //     const { webSocket } = (await fetch(request)) as unknown as {
  //       webSocket: WebSocket;
  //     };

  //     return new Response(null, {
  //       status: 101,
  //       webSocket
  //     });
  //   }

  //   const response = await fetch(request);

  //   const requestIsForHtml = request.headers
  //     .get('Accept')
  //     ?.includes('text/html');
  //   if (requestIsForHtml) {
  //     let indexBody = (await response.text()).replace(
  //       '</head>',
  //       `${piercingFragmentHostInlineScript}\n` + '</head>'
  //     );

  //     if (!this.config.isolateFragments?.(env)) {
  //       // We need to include the qwikLoader script here
  //       // this is a temporary bugfix, see: https://jira.cfops.it/browse/DEVDASH-51
  //       indexBody = indexBody.replace(
  //         '</head>',
  //         `\n${qwikloaderScript}</head>`
  //       );
  //     }
  //     return new Response(indexBody, response);
  //   }

  //   return response;
  // }

  private async fetchSSRedFragment(
    env: Env,
    fragmentConfig: FragmentConfig<Env>,
    request: Request,
    prePiercing = true
  ): Promise<ReadableStream> {
    const service = this.getFragmentFetcher(env, fragmentConfig.fragmentId);
    const newRequest = this.getRequestForFragment(request, fragmentConfig, env);
    const response = await service.fetch(newRequest);
    let fragmentStream = response.body!;

    // const fragmentId = fragmentConfig.fragmentId;
    // const framework = fragmentConfig.framework;

    const prePiercingStyles = prePiercing
      ? `<style>${fragmentConfig.prePiercingStyles}</style>`
      : ``;

    let template = `
      <piercing-fragment-host fragment-id=${fragmentConfig.fragmentId}>
        ${prePiercingStyles}
        --FRAGMENT_CONTENT--
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
    return wrapStreamInText(preFragment, postFragment, fragmentStream);
  }

  private getRequestForFragment(
    request: Request,
    fragmentConfig: FragmentConfig<Env>,
    env: Env
  ) {
    const url = new URL(
      request.url.replace(`piercing-fragment/${fragmentConfig.fragmentId}`, '')
    );

    const transformRequest =
      fragmentConfig.transformRequest ?? this.defaultTransformRequest;
    const newRequest = transformRequest(
      new Request(url, request),
      env,
      fragmentConfig
    );
    return newRequest;
  }

  private getFragmentFetcher(env: Env, fragmentId: string): any {
    // @ts-ignore
    return env[`${fragmentId}-fragment`];
  }

  private proxyAssetRequestToFragmentWorker(
    env: Env,
    { fragmentId }: FragmentConfig<Env>,
    request: Request
  ) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const fragmentBasePathRegex = new RegExp(
      `^\\/_fragment\\/${fragmentId}(?:\\/?)(.*)$`
    );
    const match = fragmentBasePathRegex.exec(pathname);
    const assetPath = match?.[1] ?? '';
    // const service = this.getFragmentFetcher(env, fragmentId);
    url.pathname = `/${assetPath}`;
    url.hostname = `${fragmentId}.pages.dev`;
    const newRequest = new Request(url, request);
    // return service.fetch(newRequest);
    return fetch(newRequest);
    // return fetch(new )
  }

  private validateFragmentConfigs(env: Env): void {
    const missingBindingFragmentIds = [...this.fragmentConfigs.keys()].filter(
      fragmentId => !this.getFragmentFetcher(env, fragmentId)
    );
    if (missingBindingFragmentIds.length) {
      throw new Error(
        "Some fragments have been configured in the gateway but their services aren't" +
          ' registered in the toml file, please correct the fragment id provided or' +
          ' make sure that the toml file contains the following services: ' +
          missingBindingFragmentIds.map(id => `${id}-fragment`).join(', ')
      );
    }
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
