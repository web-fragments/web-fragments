import {
  getPermalink,
  /* getBlogPermalink, */ getAsset,
} from "./utils/permalinks";

export const headerData = {
  links: [
    {
      text: "API Documentation",
      links: [
        {
          text: "Getting Started",
          href: getPermalink("/documentation/getting-started"),
        },
        {
          text: "Elements",
          href: getPermalink("/documentation/elements"),
        },
        {
          text: "Gateway",
          href: getPermalink("/documentation/gateway"),
        },
        {
          text: "Middleware",
          href: getPermalink("/documentation/middleware"),
        },
        {
          text: "Reframed",
          href: getPermalink("/documentation/reframed"),
        },
        {
          text: "Eager-rendering (piercing)",
          href: getPermalink(
            "/documentation/middleware#eager-rendering-or-piercing",
          ),
        },
        {
          text: "Broadcasting events",
          href: getPermalink("/documentation/broadcasting-state"),
        },
        {
          text: "Troubleshooting",
          href: getPermalink("/documentation/troubleshooting"),
        },
      ],
    },
    {
      text: "Architecture",
      links: [
        {
          text: "Rationale",
          href: getPermalink("/architecture/rationale"),
        },
        {
          text: "Architecture",
          href: getPermalink("/architecture/architecture"),
        },
      ],
    },
    {
      text: "Blog",
      links: [
        {
          text: "Coming soon!",
          href: getPermalink("coming-soon", "post"),
        },
        /*         {
          text: 'Blog List',
          href: getBlogPermalink(),
        },
        {
          text: 'Category Page',
          href: getPermalink('tutorials', 'category'),
        }, */
      ],
    },
  ],
  actions: [
    {
      text: "Enterprise migration example",
      href: "https://github.com/anfibiacreativa/web-fragments-migration-demo",
      target: "_blank",
    },
  ],
};

export const footerData = {
  links: [
    {
      title: "Resources",
      links: [
        { text: "API", href: "/resources/api-reference" },
        { text: "Getting Started", href: "/documentation/getting-started" },
        {
          text: "Enterprise Sample",
          href: "https://github.com/anfibiacreativa/web-fragments-migration-demo",
        },
        { text: "Microfrontend.dev", href: "https://www.microfrontend.dev" },
      ],
    },
    {
      title: "Open Source",
      links: [
        { text: "Contribution Guidelines", href: "/contributing/guidelines" },
        { text: "Supporters", href: "/contributing/supporters" },
        { text: "Code of Conduct", href: "/contributing/coc" },
      ],
    },
  ],
  secondaryLinks: [
    { text: "Terms", href: getPermalink("/terms") },
    { text: "Privacy Policy", href: getPermalink("/privacy") },
  ],
  socialLinks: [
    { ariaLabel: "X", icon: "tabler:brand-x", href: "https://x.com/igorminar" },
    { ariaLabel: "RSS", icon: "tabler:rss", href: getAsset("/rss.xml") },
    {
      ariaLabel: "Github",
      icon: "tabler:brand-github",
      href: "https://github.com/web-fragments/web-fragments",
    },
  ],
  footNote: `
    <img class="w-5 h-5 md:w-6 md:h-6 md:-mt-0.5 bg-cover mr-1.5 rtl:mr-0 rtl:ml-1.5 float-left rtl:float-right rounded-sm" src="https://onwidget.com/favicon/favicon-32x32.png" alt="onWidget logo" loading="lazy"></img>
    Site made with <a class="text-blue-600 underline dark:text-muted" href="https://onwidget.com/"> Astrowind</a> · All rights reserved.
  `,
};
