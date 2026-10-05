// Shaped like SvelteKit 3's plugins (#1200): `compile`, which poveste ignores, sets
// a relative `base`; `setup`, which it keeps, carries an alias the book needs but
// also serves an app of its own and turns off the single-page fallback.
export default {
  plugins: [
    {
      name: 'fixture-compile',
      config: () => ({ base: './' }),
    },
    {
      name: 'fixture-setup',
      config: () => ({ appType: 'custom', resolve: { alias: { '#fixture-alias': '/fixture-alias' } } }),
      configureServer(server) {
        server.middlewares.use((_request, response) => response.end('the framework app'))
      },
    },
  ],
}
