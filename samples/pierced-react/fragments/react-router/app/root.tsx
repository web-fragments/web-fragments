import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	useRouteError,
} from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

export function loader({ request }: LoaderFunctionArgs) {
	const isEmbedded = request.headers.get('x-fragment-mode') === 'embedded';
	return {
		standaloneMode: !isEmbedded,
	};
}

export function Layout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}

export default function App() {
	const loaderData = useLoaderData<typeof loader>();
	const content = (
		<>
			<Meta />
			<Links />
			<Outlet />
			<ScrollRestoration />
			<Scripts />
		</>
	);

	return loaderData.standaloneMode ? (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
			</head>
			<body>{content}</body>
		</html>
	) : (
		<div>{content}</div>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();
	let message = 'Oops!';
	let details = 'An unexpected error occurred.';
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? '404' : 'Error';
		details = error.status === 404 ? 'The requested page could not be found.' : error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main>
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre>
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
