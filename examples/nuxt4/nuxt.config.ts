import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],

  i18n: {
    locales: [
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'Français' },
    ],
    defaultLocale: 'en',
  },

  // Tailwind v4 is used through its Vite plugin: @nuxtjs/tailwindcss is a v3-era
  // module that registers Tailwind as a PostCSS plugin, which v4 rejects.
  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  runtimeConfig: {
    public: {
      configFromNuxt: 'test',
    },
  },

  compatibilityDate: '2024-12-20',
})
