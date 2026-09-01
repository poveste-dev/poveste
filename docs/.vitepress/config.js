// Netlify sets these during a build and nothing sets them locally. Emitting them
// makes "which branch is poveste.dev serving?" a question the page answers, rather
// than one inferred from whichever prose happens to differ between branches — an
// inference that stopped working once the branches converged (#321).
const deploy = [process.env.BRANCH, process.env.COMMIT_REF?.slice(0, 7), process.env.CONTEXT]
  .filter(Boolean)
  .join(' ')

const SITE = 'https://poveste.dev'
// The home page is `layout: home` and carries no title of its own, so this is
// what it falls back to — and `||`, not `??`, because what it has is empty.
const CARD_TITLE = 'Poveste — interactive component playgrounds for Vue, Nuxt, Svelte, SvelteKit and Quasar'

// `index.md` is the directory itself; everything else drops the extension. This
// is the shape `cleanUrls` links to, so the canonical matches what the site
// actually offers rather than the `.html` twin Netlify also answers on.
function pageUrl(relativePath) {
  const path = relativePath.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1')
  return `${SITE}/${path}`
}

module.exports = {
  title: 'Poveste',
  description: 'Interactive component playgrounds for Vue, Nuxt, Svelte, SvelteKit and Quasar — a drop-in fork of histoire, with Quasar support histoire does not ship.',

  sitemap: {
    hostname: 'https://poveste.dev',
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { property: 'og:site_name', content: 'Poveste' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:description', content: 'Interactive component playgrounds for Vue, Nuxt, Svelte, SvelteKit and Quasar — a drop-in fork of histoire, with Quasar support histoire does not ship.' }],
    ['meta', { property: 'og:image', content: 'https://poveste.dev/opengraph.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.bunny.net/css?family=fira-sans:400,400i,600,600i' }],
    ...(deploy ? [['meta', { name: 'poveste:deploy', content: deploy }]] : []),
  ],

  // Every page served at two addresses with nothing saying which counted, and a
  // single `og:url` naming the home page on all 37 of them — so Google indexed
  // one (#502). Both are per page now, from one source.
  transformPageData(pageData) {
    const url = pageUrl(pageData.relativePath)
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: pageData.frontmatter.title || pageData.title || CARD_TITLE }],
    )
  },

  // Links without `.html`, so what the site offers and what the canonical claims
  // are the same string.
  cleanUrls: true,

  lastUpdated: true,

  themeConfig: {
    logo: '/logo.svg',

    editLink: {
      pattern: 'https://github.com/poveste-dev/poveste/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License. Updates on <a href="https://bsky.app/profile/poveste.dev">Bluesky</a> and <a href="https://x.com/50rayn">X</a>.',
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
      // The project's own handle, and the only one that proves itself: the
      // `_atproto` record on this domain is what verifies it (#482).
      {
        icon: {
          svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Bluesky</title><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.296 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/></svg>',
        },
        link: 'https://bsky.app/profile/poveste.dev',
        ariaLabel: 'Poveste on Bluesky',
      },
      // A personal handle rather than a project one, deliberately: a maintainer
      // people can follow beats a logo with no followers (#482).
      { icon: 'x', link: 'https://x.com/50rayn', ariaLabel: 'Updates on X' },
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
              text: 'Wrapper',
              link: '/guide/svelte/wrapper',
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
          text: 'Svelte examples',
          collapsed: false,
          items: [
            {
              text: 'Single stories',
              link: '/examples/svelte/single-stories',
            },
            {
              text: 'Story with variants',
              link: '/examples/svelte/variant-stories',
            },
            {
              text: 'Controlled stories',
              link: '/examples/svelte/controlled-stories',
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
