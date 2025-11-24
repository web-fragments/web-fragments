import { initializeWebFragments } from 'web-fragments';

const webFragmentsLogo = '/webfragmentslogo.svg';
const remixLogo = new URL('./assets/remix.svg', import.meta.url).href;
const qwikLogo = new URL('./assets/qwik.svg', import.meta.url).href;
const reactRouterLogo = new URL('./assets/react-router.svg', import.meta.url).href;

initializeWebFragments();

function counter() {
	let count = 0;

	return {
		increment() {
			count += 1;
			return count;
		},
	};
}

type FragmentMeta = {
	fragmentId: string;
	heading: string;
	note: string;
	logos: Array<{ src: string; alt: string }>;
};

const fragmentMeta: Record<string, FragmentMeta> = {
	remix: {
		fragmentId: 'remix',
		heading: 'Web Fragments + Remix',
		note: 'Click the counter or navigate to Remix routes; the Node.js host stays mounted while the fragment handles the new view.',
		logos: [
			{ src: webFragmentsLogo, alt: 'Web Fragments logo' },
			{ src: remixLogo, alt: 'Remix logo' },
		],
	},
	qwik: {
		fragmentId: 'qwik',
		heading: 'Web Fragments + Qwik',
		note: 'Interactive state updates here are isolated from the Qwik fragment, showcasing safe composition inside the Node.js host.',
		logos: [
			{ src: webFragmentsLogo, alt: 'Web Fragments logo' },
			{ src: qwikLogo, alt: 'Qwik logo' },
		],
	},
	'react-router': {
		fragmentId: 'react-router',
		heading: 'Web Fragments + React Router',
		note: 'Navigate around the React Router fragment while the Node.js shell stays live—perfect for multi-framework SPA scenarios.',
		logos: [
			{ src: webFragmentsLogo, alt: 'Web Fragments logo' },
			{ src: reactRouterLogo, alt: 'React Router logo' },
		],
	},
};

const slugAliases: Record<string, keyof typeof fragmentMeta> = {
	rr: 'react-router',
};

document.addEventListener('DOMContentLoaded', () => {
	const fwSlug = new URL(window.location.href).pathname.match(/\/(?<fwName>[^-]+)-page/)?.groups?.fwName ?? 'remix';
	const metaKey = slugAliases[fwSlug] ?? (fwSlug as keyof typeof fragmentMeta);
	const meta = fragmentMeta[metaKey] ?? fragmentMeta.remix;
	const main = document.querySelector<HTMLElement>('main.fragment-main') ?? document.querySelector<HTMLElement>('main');

	if (!main) {
		return;
	}

	main.innerHTML = `
		<div class="page-shell fragment-page">
			<div class="fragment-page__logos">
				${meta.logos.map((logo) => `<img src="${logo.src}" alt="${logo.alt}" loading="lazy" decoding="async" />`).join('')}
			</div>
			<h1>${meta.heading}</h1>
			<p class="hint">${meta.note}</p>
			<div class="card">
				<button title="This is an independent JavaScript component" class="counter" id="counter">click to count: 0</button>
			</div>
			<section class="fragment-showcase">
				<div class="fragment-container pierced">
					<h2>Pierced fragment</h2>
					<web-fragment fragment-id="${meta.fragmentId}"></web-fragment>
				</div>
				<div class="fragment-container">
					<h2>Fetched fragment</h2>
					<button id="toggle-host">Toggle host</button>
					<div class="host-wrapper"></div>
				</div>
			</section>
		</div>
	`;

	const counterButton = document.getElementById('counter');
	const counterInstance = counter();
	const toggle = document.getElementById('toggle-host');

	if (counterButton) {
		counterButton.addEventListener('click', () => {
			const count = counterInstance.increment();
			counterButton.textContent = `click to count: ${count}`;
			console.log('Counter incremented to:', count);
		});
	}

	if (toggle) {
		let toggled = false;

		toggle.addEventListener('click', () => {
			const hostWrapper = document.querySelector<HTMLElement>('.host-wrapper');
			if (!hostWrapper) {
				return;
			}
			if (!toggled) {
				toggled = true;
				const fragment = document.createElement('web-fragment');
				fragment.setAttribute('fragment-id', meta.fragmentId);
				hostWrapper.appendChild(fragment);
			} else {
				toggled = false;
				hostWrapper.innerHTML = '';
			}
		});
	}
});
