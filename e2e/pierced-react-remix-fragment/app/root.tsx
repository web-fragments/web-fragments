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

/**
 * This is a hack to work around an issue with WritableDOM not populating
 * the contents of the last script element (which just so happens to be responsible
 * for hydrating the application). We noticed that if that script tag wasn't the last
 * child of the body, its contents were inserted correctly. We're adding this empty
 * div here to make the script tag before it no longer be the last child.
 */
const HackDiv = () => <div />;

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
			<HackDiv />
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
			<HackDiv />
		</div>
	);
}

export default function App() {
	return <Outlet />;
}
