import { getPermalink, /* getBlogPermalink, */ getAsset } from './utils/permalinks';

export const headerData = {
	links: [
		{
			text: 'Developer Documentation',
			links: [
				{
					text: 'Getting Started',
					href: getPermalink('/documentation/getting-started'),
				},

				{
					text: 'Glossary',
					href: getPermalink('/documentation/glossary'),
				},

				{
					text: 'Reframing',
					href: getPermalink('/documentation/reframing'),
				},

				{
					text: 'Elements',
					href: getPermalink('/documentation/elements'),
				},

				{
					text: 'Gateway',
					href: getPermalink('/documentation/gateway'),
				},

				{
					text: 'Broadcasting events',
					href: getPermalink('/documentation/broadcasting-state'),
				},

				{
					text: 'Troubleshooting',
					href: getPermalink('/documentation/troubleshooting'),
				},
			],
		},
		{
			text: 'Architecture',
			links: [
				{
					text: 'Architecture',
					href: getPermalink('/architecture/architecture'),
				},
				{
					text: 'Rationale',
					href: getPermalink('/architecture/rationale'),
				},
			],
		},
	],
	actions: [
		{
			text: 'Enterprise migration example',
			href: 'https://github.com/anfibiacreativa/web-fragments-react-migration-path',
			target: '_blank',
		},
	],
};

export const footerData = {
	links: [
		{
			title: 'Resources',
			links: [
				{ text: 'API', href: '/resources/api-reference' },
				{ text: 'Getting Started', href: '/documentation/getting-started' },
				{
					text: 'Enterprise Sample',
					href: 'https://github.com/anfibiacreativa/web-fragments-react-migration-path',
				},
				{
					text: 'Join our Discord',
					href: 'https://discord.com/invite/dcgA8YxyCb',
				},
				{ text: 'Microfrontend.dev', href: 'https://www.microfrontend.dev' },
			],
		},
		{
			title: 'Open Source',
			links: [
				{ text: 'Contribution Guidelines', href: '/contributing/guidelines' },
				{ text: 'Supporters', href: '/contributing/supporters' },
				{ text: 'Code of Conduct', href: '/contributing/coc' },
			],
		},
	],
	secondaryLinks: [
		{ text: 'GitHub Project', href: 'https://github.com/web-fragments/web-fragments' },
		{ text: 'Npm package', href: 'https://www.npmjs.com/package/web-fragments' },
	],
	socialLinks: [
		{ ariaLabel: 'X', icon: 'tabler:brand-x', href: 'https://x.com/igorminar' },
		{ ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
		{
			ariaLabel: 'Github',
			icon: 'tabler:brand-github',
			href: 'https://github.com/web-fragments/web-fragments',
		},
		{
			ariaLabel: 'Discord',
			icon: 'tabler:brand-discord',
			href: 'https://discord.com/invite/dcgA8YxyCb',
		},
	],
	footNote: `
    Site made with Astrowind · All rights reserved.
  `,
};
