import { defineVitestConfig } from '@nuxt/test-utils/config'
import { povesteTesting } from '@poveste/plugin-vue'

export default defineVitestConfig({
  plugins: [povesteTesting()],
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: { domEnvironment: 'jsdom' },
    },
    // Not beside the stories: Nuxt registers every `.ts` under `app/components` as
    // a component.
    include: ['test/**/*.story.test.ts'],
  },
})
