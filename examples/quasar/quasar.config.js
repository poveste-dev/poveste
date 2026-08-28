// The minimum Quasar accepts. This book exists to prove the config extraction in
// docs/guide/config.md keeps working, not to be a Quasar app.
export default function () {
  return {
    boot: ['greeting'],
    css: [],
    extras: [],
    build: { vueRouterMode: 'hash' },
    framework: { config: {} },
  }
}
