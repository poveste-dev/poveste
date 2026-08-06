module.exports = {
  title: 'Poveste',
  description: 'Fast stories powered by Vite',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { property: 'og:title', content: 'Poveste' }],
    ['meta', { property: 'og:site_name', content: 'Poveste' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:description', content: 'Fast stories powered by Vite' }],
    ['meta', { property: 'og:url', content: 'https://poveste.dev/' }],
    ['meta', { property: 'og:image', content: 'https://poveste.dev/opengraph.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.bunny.net/css?family=fira-sans:400,400i,600,600i' }],
  ],

  lastUpdated: true,

  themeConfig: {
    logo: '/logo.svg',

    editLink: {
      pattern: 'https://github.com/poveste-dev/poveste/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2022-present Guillaume Chau & poveste contributors',
    },

    nav: [
      {
        text: 'Guide',
        items: [
          {
            text: 'Frameworks',
            items: [
              {
                text: 'Vue 3',
                link: '/guide/vue3/getting-started',
              },
              {
                text: 'Svelte 3',
                link: '/guide/svelte3/getting-started',
              },
            ],
          },
          {
            text: 'About',
            items: [
              {
                text: 'Why Poveste?',
                link: '/guide/',
              },
              {
                text: 'Getting started',
                link: '/guide/getting-started',
              },
              {
                text: 'Migrating from Poveste',
                link: '/guide/migration-from-histoire',
              },
              {
                text: 'Configuration',
                link: '/guide/config',
              },
              {
                text: 'Styles & CSS',
                link: '/guide/css',
              },
              {
                text: 'Plugins',
                link: '/guide/plugins/official',
              },
              {
                text: 'Builtin controls',
                link: 'https://github.com/poveste-dev/poveste/tree/main/packages/poveste-controls',
              },
            ],
          },
        ],
      },
      { text: 'Examples', link: '/examples/' },
      { text: 'API Reference', link: '/reference/config' },
      {
        text: 'Changelog',
        link: 'https://github.com/poveste-dev/poveste/blob/main/CHANGELOG.md',
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/poveste-dev/poveste' },
    ],

    sidebar: {
      '/reference/': [
        {
          text: 'API Reference',
          items: [
            {
              text: 'Configuration reference',
              link: '/reference/config',
            },
            {
              text: 'Client API',
              link: '/reference/client',
            },
            {
              text: 'Plugin API',
              link: '/reference/plugin-api',
            },
          ],
        },
        {
          text: 'Story components (Vue)',
          collapsible: true,
          items: [
            {
              text: 'Story',
              link: '/reference/vue3/story',
            },
            {
              text: 'Variant',
              link: '/reference/vue3/variant',
            },
          ],
        },
        {
          text: 'Story components (Svelte)',
          collapsible: true,
          items: [
            {
              text: 'Hst.Story',
              link: '/reference/svelte3/story',
            },
            {
              text: 'Hst.Variant',
              link: '/reference/svelte3/variant',
            },
          ],
        },
      ],
      '/guide/vue3/': [
        {
          text: 'Guide - Vue 3',
          collapsible: true,
          items: [
            {
              text: 'Getting Started',
              link: '/guide/vue3/getting-started',
            },
            {
              text: 'Stories',
              link: '/guide/vue3/stories',
            },
            {
              text: 'State & Controls',
              link: '/guide/vue3/controls',
            },
            {
              text: 'Events',
              link: '/guide/vue3/events',
            },
            {
              text: 'App setup',
              link: '/guide/vue3/app-setup',
            },
            {
              text: 'Wrapper',
              link: '/guide/vue3/wrapper',
            },
            {
              text: 'Documentation',
              link: '/guide/vue3/docs',
            },
            {
              text: 'Hierarchy',
              link: '/guide/vue3/hierarchy',
            },
          ],
        },
        {
          text: 'Learn more',
          collapsible: true,
          items: [
            {
              text: 'About Poveste ⮌',
              link: '/guide/',
            },
            {
              text: 'Configuration ⮌',
              link: '/guide/config',
            },
            {
              text: 'Plugins ⮌',
              link: '/guide/plugins/official',
            },
          ],
        },
      ],
      '/guide/svelte3/': [
        {
          text: 'Guide - Svelte 3',
          collapsible: true,
          items: [
            {
              text: 'Getting Started',
              link: '/guide/svelte3/getting-started',
            },
            {
              text: 'Stories',
              link: '/guide/svelte3/stories',
            },
            {
              text: 'State & Controls',
              link: '/guide/svelte3/controls',
            },
            {
              text: 'Events',
              link: '/guide/svelte3/events',
            },
            {
              text: 'Documentation',
              link: '/guide/svelte3/docs',
            },
            {
              text: 'Hierarchy',
              link: '/guide/svelte3/hierarchy',
            },
          ],
        },
        {
          text: 'Learn more',
          collapsible: true,
          items: [
            {
              text: 'About Poveste ⮌',
              link: '/guide/',
            },
            {
              text: 'Configuration ⮌',
              link: '/guide/config',
            },
            {
              text: 'Plugins ⮌',
              link: '/guide/plugins/official',
            },
          ],
        },
      ],
      '/guide/': [
        {
          text: 'About',
          items: [
            {
              text: 'Why Poveste',
              link: '/guide/',
            },
            {
              text: 'Getting Started',
              link: '/guide/getting-started',
            },
            {
              text: 'Configuration',
              link: '/guide/config',
            },
            {
              text: 'Styles & CSS',
              link: '/guide/css',
            },
          ],
        },
        {
          text: 'Plugins',
          items: [
            {
              text: 'Official plugins',
              link: '/guide/plugins/official',
            },
            {
              text: 'Plugin development guide',
              link: '/guide/plugins/development',
            },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'General examples',
          collapsible: true,
          items: [
            {
              text: 'Tailwind CSS',
              link: '/examples/tailwind',
            },
          ],
        },
        {
          text: 'Vue 3 examples',
          collapsible: true,
          items: [
            {
              text: 'Single stories',
              link: '/examples/vue3/single-stories',
            },
            {
              text: 'Variant stories',
              link: '/examples/vue3/variant-stories',
            },
            {
              text: 'Controlled stories',
              link: '/examples/vue3/controlled-stories',
            },
          ],
        },
        {
          text: 'Visual regression testing',
          collapsible: true,
          items: [
            {
              text: 'Lost Pixel',
              link: '/examples/visual-regression-testing/lost-pixel',
            },
            {
              text: 'Percy',
              link: '/examples/visual-regression-testing/percy',
            },
          ],
        },
      ],
    },

    algolia: {
      appId: 'JB9PU89D4X',
      apiKey: '1c9759220b24c8ccbc064a6df95e2108',
      indexName: 'poveste',
    },
  },
}
