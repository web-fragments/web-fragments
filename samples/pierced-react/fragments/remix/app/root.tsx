import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from '@remix-run/react';
import './tailwind.css';

function isEmbeddedMode(request: Request) {
	return request.headers.get('x-fragment-mode') === 'embedded';
}

export async function loader({ request }: LoaderFunctionArgs) {
	return json({
		standaloneMode: !isEmbeddedMode(request),
	});
}

export function Layout({ children }: { children: React.ReactNode }) {
	const data = useRouteLoaderData<typeof loader>('root');

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
