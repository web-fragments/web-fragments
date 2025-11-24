import { Link } from 'react-router';

export const meta = () => {
	return [{ title: 'React Router Counter' }, { name: 'description', content: 'Welcome to a React Router Counter!' }];
};

export default function Home() {
	return (
		<>
			<Link to="/rr-page">Go To Counter</Link>
		</>
	);
}
