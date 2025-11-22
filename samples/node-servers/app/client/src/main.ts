type NavKey = 'home' | 'remix' | 'qwik';

const navTargets: Record<NavKey, string> = {
	home: '/',
	remix: '/remix-page',
	qwik: '/qwik-page',
};

const normalizePath = (path: string) => {
	if (path === '/') {
		return '/';
	}
	return path.replace(/\/$/, '');
};

const updateActiveNav = (path: string = window.location.pathname) => {
	const current = normalizePath(path);
	const links = document.querySelectorAll<HTMLAnchorElement>('.nav-links a[data-nav]');
	links.forEach((link) => {
		const navKey = link.getAttribute('data-nav') as NavKey | null;
		if (!navKey) {
			return;
		}
		const targetPath = normalizePath(navTargets[navKey]);
		const isActive = current === targetPath || (targetPath !== '/' && current.startsWith(`${targetPath}/`));
		link.classList.toggle('active', isActive);
		if (isActive) {
			link.setAttribute('aria-current', 'page');
		} else {
			link.removeAttribute('aria-current');
		}
	});
};

const preloadRemixButton = document.getElementById('preload-remix');

if (preloadRemixButton instanceof HTMLButtonElement) {
	preloadRemixButton.addEventListener('click', () => {
		const targetPath = navTargets.remix;
		window.history.pushState({}, '', targetPath);
		updateActiveNav(targetPath);
	});
}

window.addEventListener('popstate', () => updateActiveNav());

updateActiveNav();
