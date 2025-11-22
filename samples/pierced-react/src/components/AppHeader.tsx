import { Link, useLocation } from 'react-router-dom';
import logoUrl from '../assets/webfragmentslogo.svg';

type NavLink = {
	label: string;
	to: string;
	matchPath: string;
};

const navLinks: NavLink[] = [
	{ label: 'Home', to: '/', matchPath: '/' },
	{ label: 'Remix', to: '/remix-page', matchPath: '/remix-page' },
	{ label: 'Qwik', to: '/qwik-page', matchPath: '/qwik-page' },
	{ label: 'React Router', to: '/rr-page', matchPath: '/rr-page' },
];

function AppHeader() {
	const location = useLocation();

	return (
		<header className="app-header">
			<div className="header-inner">
				<Link to="/" className="brand">
					<img className="brand-logo" src={logoUrl} alt="web-fragments logo" />
					<span>Pierced React Host</span>
				</Link>
				<nav className="nav-links" aria-label="Fragment navigation">
					{navLinks.map(({ label, to, matchPath }) => {
						const isActive = location.pathname === matchPath || location.pathname.startsWith(`${matchPath}/`);

						return (
							<Link key={to} to={to} className={isActive ? 'active' : undefined} aria-current={isActive ? 'page' : undefined}>
								{label}
							</Link>
						);
					})}
				</nav>
			</div>
		</header>
	);
}

export default AppHeader;
