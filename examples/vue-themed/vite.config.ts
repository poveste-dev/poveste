import vue from '@vitejs/plugin-vue'
import { defaultColors } from 'poveste'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
  ],

  poveste: {
    theme: {
      title: 'Acme Design System',
      favicon: './public/my-favicon.svg',
      logo: {
        square: './src/img/logo-square.svg',
        light: './src/img/logo-light.svg',
        dark: './src/img/logo-dark.svg',
      },
      colors: {
        primary: defaultColors.cyan,
      },
    },
    setupFile: './src/poveste-setup.ts',
    // vite: {
    //   server: {
    //     port: 3042,
    //   },
    // },
  },
})
