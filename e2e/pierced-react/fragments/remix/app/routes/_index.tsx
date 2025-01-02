import type { MetaFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';

export const meta: MetaFunction = () => {
	return [{ title: 'New Remix Counter' }, { name: 'description', content: 'Welcome to a Remix Counter!' }];
};

export default function Index() {
	return (
		<>
			<Link to={'/remix-page'}>Go To Counter</Link>
		</>
	);
}
