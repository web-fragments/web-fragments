import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
	index('routes/home.tsx'),
	route('/rr-page', 'routes/rr-page.tsx'),
	route('/rr-page/details', 'routes/rr-page-details.tsx'),
] satisfies RouteConfig;
