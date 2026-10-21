# Nuxt 4 example

A Nuxt 4 application with Poveste wired in, used as a fixture: its story build
and Playwright suite run in CI as the `nuxt` project, so this is what proves
the Nuxt integration rather than a sentence in the docs.

## Running it

From the repository root — the workspace is installed once, not per example:

```bash
pnpm install
pnpm run build
```

Then, in this directory:

```bash
pnpm run story:dev      # the book, on a dev server
pnpm run story:build    # build it
pnpm run story:preview  # serve the built book
pnpm run dev            # the Nuxt app itself
```

## Outside the workspace, with npm

A copy of this directory installs with plain `npm install` once its
`workspace:*` and `catalog:` versions are filled in. The `overrides` in
`package.json` are for that case only, since pnpm reads overrides from the
workspace root alone: `@nuxtjs/i18n` brings `@intlify/bundle-utils`, which
depends on `esbuild` `^0.25`, and npm otherwise refuses it beside Vite 8's
`esbuild` peer, `^0.27.0 || ^0.28.0`, with `ERESOLVE` (#1406).

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the wider development loop, and
the [Nuxt guide](https://poveste.dev/guide/nuxt/getting-started) for how
to set this up in your own project.
