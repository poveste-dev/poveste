// Shaped like SvelteKit 3's plugins (#1200): `compile`, which poveste ignores, sets
// a relative `base`; `setup`, which it keeps, carries an alias the book needs and
// turns off the single-page fallback the book is served through.
export default {
  plugins: [
    {
      name: 'fixture-compile',
      config: () => ({ base: './' }),
    },
    {
      name: 'fixture-setup',
      config: () => ({ appType: 'custom', resolve: { alias: { '#fixture-alias': '/fixture-alias' } } }),
    },
  ],
}
