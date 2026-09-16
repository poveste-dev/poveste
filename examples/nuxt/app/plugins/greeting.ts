// A Nuxt plugin that injects a value, which is the case the `useNuxtApp` stub
// broke: the stub answered `runWithContext` and nothing else, so anything a
// plugin provided was unreachable from a story (histoire#666, #439).
export default defineNuxtPlugin(() => ({
  provide: {
    greeting: 'provided by a Nuxt plugin',
  },
}))
