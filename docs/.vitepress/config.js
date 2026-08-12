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
                link: '/guide/vue/getting-started',
              },
              {
                text: 'Svelte',
                link: '/guide/svelte/getting-started',
              },
              {
                text: 'SvelteKit',
                link: '/guide/svelte/getting-started#sveltekit',
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
                text: 'Migrating from Histoire',
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
              link: '/reference/vue/story',
            },
            {
              text: 'Variant',
              link: '/reference/vue/variant',
            },
          ],
        },
        {
          text: 'Story components (Svelte)',
          collapsible: true,
          items: [
            {
              text: 'Hst.Story',
              link: '/reference/svelte/story',
            },
            {
              text: 'Hst.Variant',
              link: '/reference/svelte/variant',
            },
          ],
        },
      ],
      '/guide/vue/': [
        {
          text: 'Guide - Vue 3',
          collapsible: true,
          items: [
            {
              text: 'Getting Started',
              link: '/guide/vue/getting-started',
            },
            {
              text: 'Stories',
              link: '/guide/vue/stories',
            },
            {
              text: 'State & Controls',
              link: '/guide/vue/controls',
            },
            {
              text: 'Events',
              link: '/guide/vue/events',
            },
            {
              text: 'App setup',
              link: '/guide/vue/app-setup',
            },
            {
              text: 'Wrapper',
              link: '/guide/vue/wrapper',
            },
            {
              text: 'Documentation',
              link: '/guide/vue/docs',
            },
            {
              text: 'Hierarchy',
              link: '/guide/vue/hierarchy',
            },
          ],
        },
        {
          text: 'Learn more',
          collapsible: true,
          items: [
            {
              text: 'About Poveste',
              link: '/guide/',
            },
            {
              text: 'Configuration',
              link: '/guide/config',
            },
            {
              text: 'Plugins',
              link: '/guide/plugins/official',
            },
          ],
        },
      ],
      '/guide/svelte/': [
        {
          text: 'Guide - Svelte',
          collapsible: true,
          items: [
            {
              text: 'Getting Started',
              link: '/guide/svelte/getting-started',
            },
            {
              text: 'SvelteKit',
              link: '/guide/svelte/getting-started#sveltekit',
            },
            {
              text: 'Stories',
              link: '/guide/svelte/stories',
            },
            {
              text: 'State & Controls',
              link: '/guide/svelte/controls',
            },
            {
              text: 'Events',
              link: '/guide/svelte/events',
            },
            {
              text: 'App setup',
              link: '/guide/svelte/app-setup',
            },
            {
              text: 'Documentation',
              link: '/guide/svelte/docs',
            },
            {
              text: 'Hierarchy',
              link: '/guide/svelte/hierarchy',
            },
          ],
        },
        {
          text: 'Learn more',
          collapsible: true,
          items: [
            {
              text: 'About Poveste',
              link: '/guide/',
            },
            {
              text: 'Configuration',
              link: '/guide/config',
            },
            {
              text: 'Plugins',
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
              link: '/examples/vue/single-stories',
            },
            {
              text: 'Variant stories',
              link: '/examples/vue/variant-stories',
            },
            {
              text: 'Controlled stories',
              link: '/examples/vue/controlled-stories',
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
