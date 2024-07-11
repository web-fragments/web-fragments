import { FragmentGateway, getPagesMiddleware } from "web-fragments/gateway";

const getGatewayMiddleware: ((devMode: boolean) => PagesFunction) & {
	_gatewayMiddleware?: PagesFunction;
} = (devMode) => {
	if (getGatewayMiddleware._gatewayMiddleware) {
		return getGatewayMiddleware._gatewayMiddleware;
	}

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
    </style>`,
	});

	gateway.registerFragment({
		fragmentId: "remix",
		prePiercingClassNames: ["remix"],
		routePatterns: ["/", "/_fragment/remix/:_*"],
		// Note: make sure to run the pierced-react-remix-fragment (with remix-serve)
		upstream: "http://localhost:3000",
		onSsrFetchError: () => {
			return new Response(
				"<p id='remix-fragment-not-found'><style>#remix-fragment-not-found { color: red; font-size: 2rem; }</style>Remix fragment not found</p>",
				{ headers: [["content-type", "text/html"]] }
			);
		},
	});

	getGatewayMiddleware._gatewayMiddleware = getPagesMiddleware(
		gateway,
		devMode ? "development" : "production"
	);
	return getGatewayMiddleware._gatewayMiddleware;
};

export const onRequest: PagesFunction<{ DEV_MODE?: boolean }> = async (
	context
) => {
	const gatewayMiddleware = getGatewayMiddleware(!!context.env.DEV_MODE);
	return gatewayMiddleware(context);
};
