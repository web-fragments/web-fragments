import { initializeWebFragments } from 'web-fragments';
import React from 'react';
import ReactDOM from 'react-dom/client';
// import App from "./App.tsx";
import Root from './routes/root';
import QwikPage from './routes/qwik';
import RemixPage from './routes/remix';
import ReactRouterPage from './routes/react-router';
import './index.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

initializeWebFragments();

const router = createBrowserRouter([
	{
		path: '/',
		element: <Root />,
	},
	{
		path: '/qwik-page/*',
		element: <QwikPage />,
	},
	{
		path: '/remix-page/*',
		element: <RemixPage />,
	},
		{
		path: '/react-router/*',
		element: <ReactRouterPage />,
	},
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>,
);
