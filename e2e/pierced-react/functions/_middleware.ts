import { FragmentGateway, getPagesMiddleware } from 'web-fragments/gateway';

const gateway = new FragmentGateway({
    prePiercingStyles: `<style id="fragment-piercing-styles" type="text/css">
      fragment-host[data-piercing="true"] {
        position: absolute;
        z-index: 9999999999999999999999999999999;
    
        &.remix {
            bottom: 14%;
            left: 50%;
            translate: -50% 0;
        }
      }
    </style>`
});

gateway.registerFragment({
    fragmentId: "remix",
    prePiercingClassNames: ['remix'],
    routePatterns: ["/", "/_fragment/remix/:_*"],
    // Note: make sure to run the pierced-react-remix-fragment (with remix-serve)
    upstream: "http://localhost:3000",
});

const gatewayMiddleware = getPagesMiddleware(gateway);

export const onRequest = gatewayMiddleware;
