# Nuxt 4 example

A Nuxt 4 application with Poveste wired in, used as a fixture: its story build
and Playwright suite run in CI as the `nuxt4` project, so this is what proves
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

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the wider development loop, and
the [Nuxt guide](https://poveste.dev/guide/vue/getting-started.html#nuxt) for how
to set this up in your own project.
