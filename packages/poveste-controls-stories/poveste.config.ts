import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstVue(),
  ],

  storyMatch: ['../poveste-controls/src/**/*.story.vue'],

  setupFile: '/poveste-setup.ts',

  theme: {
    title: 'Poveste controls',
    favicon: 'poveste.svg',
  },

  tree: {
    groups: [
      {
        id: 'top',
        title: '',
      },
      {
        id: 'controls',
        title: 'Controls',
      },
      {
        id: 'design-system',
        title: 'Design System',
      },
    ],
  },

  vite: {
    server: {
      fs: {
        allow: [
          '../poveste-controls/src',
        ],
      },
    },
  },
})
