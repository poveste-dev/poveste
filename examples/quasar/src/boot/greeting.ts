import { defineBoot } from '#q-app'

// Registered in quasar.config.js, so Quasar runs it in the app. Poveste renders
// stories in its own app, so nothing runs it there unless the setup file does —
// which is the whole point of this book (#436).
export default defineBoot(({ app }) => {
  app.config.globalProperties.$greeting = 'from a boot file'
})
