import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	json,
	useRouteLoaderData,
} from "@remix-run/react";
import "./tailwind.css";
import { LoaderFunctionArgs } from "@remix-run/node";

function isDocumentRequest(request: Request) {
	return request.headers.get("sec-fetch-dest") === "document";
}

export async function loader({ request }: LoaderFunctionArgs) {
	return json({
		// If the request came from a direct navigation to the app (a document request)
		// the app must be running standalone (e.g. in local dev) so we should serve a full html document.
		// Otherwise, we should just serve a fragment that will be rendered inside of another host application.
		standaloneMode: isDocumentRequest(request),
	});
}

export function Layout({ children }: { children: React.ReactNode }) {
	const data = useRouteLoaderData<typeof loader>("root");

	return data?.standaloneMode ? (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	) : (
		<div>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<Meta />
			<Links />
			{children}
			<ScrollRestoration />
			<Scripts />
		</div>
	);
}

export default function App() {
	return <Outlet />;
}
